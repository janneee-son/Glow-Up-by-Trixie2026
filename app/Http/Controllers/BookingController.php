<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\InspoImage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BookingController extends Controller
{
    /** Clients may change a confirmed booking only if it is further away than this. */
    private const CHANGE_CUTOFF_HOURS = 24;

    /**
     * How long one session blocks the artist's calendar, in minutes.
     * A new booking must start at least this long before or after another one.
     * Change this number to match how long your sessions usually take.
     */
    private const SESSION_MINUTES = 120;

    /** The one artist (and admin) of the studio. */
    private function theArtist(): ?User
    {
        return User::where('role', 'artist')->orderBy('id')->first();
    }

    /**
     * Is the artist already booked around this time?
     * Pending and confirmed bookings both block the slot.
     */
    private function slotTaken(int $artistId, string $date, string $time, ?int $ignoreBookingId = null): bool
    {
        $start = Carbon::parse("{$date} {$time}");

        return Booking::where('artist_id', $artistId)
            ->whereDate('booking_date', $date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($ignoreBookingId, fn ($q) => $q->where('id', '!=', $ignoreBookingId))
            ->get(['booking_time'])
            ->contains(function ($other) use ($date, $start) {
                $otherStart = Carbon::parse("{$date} {$other->booking_time}");

                return $otherStart->diffInMinutes($start, true) < self::SESSION_MINUTES;
            });
    }

    public function create(Request $request)
    {
        $artist = $this->theArtist();

        $inspoImages = InspoImage::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn ($img) => [
                'id' => $img->id,
                'url' => asset('storage/' . $img->path),
                'caption' => $img->caption,
            ]);

        return Inertia::render('bookings/create', [
            'artist' => $artist
                ? $artist->only('id', 'name', 'specialty', 'years_experience', 'bio')
                : null,
            'inspoImages' => $inspoImages,
        ]);
    }

    public function store(Request $request)
    {
        $artist = $this->theArtist();

        abort_unless($artist, 422, 'Bookings are not open yet.');

        $validated = $request->validate([
            'service' => ['required', 'string', 'max:100'],
            'booking_date' => ['required', 'date', 'after_or_equal:today'],
            'booking_time' => ['required', 'date_format:H:i,H:i:s'],
            'notes' => ['nullable', 'string', 'max:500'],
            'inspo_image_id' => [
                'nullable',
                Rule::exists('inspo_images', 'id')->where('user_id', $request->user()->id),
            ],
            'new_inspo_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
        ]);

        if (Carbon::parse("{$validated['booking_date']} {$validated['booking_time']}")->isPast()) {
            throw ValidationException::withMessages([
                'booking_time' => 'Please pick a time in the future.',
            ]);
        }

        if ($this->slotTaken($artist->id, $validated['booking_date'], $validated['booking_time'])) {
            throw ValidationException::withMessages([
                'booking_time' => 'That time is already taken. Please choose a different time.',
            ]);
        }

        $inspoId = $validated['inspo_image_id'] ?? null;

        if ($request->hasFile('new_inspo_image')) {
            $path = $request->file('new_inspo_image')->store('inspo', 'public');

            $inspo = InspoImage::create([
                'user_id' => $request->user()->id,
                'path' => $path,
            ]);

            $inspoId = $inspo->id;
        }

        Booking::create([
            'client_id' => $request->user()->id,
            'artist_id' => $artist->id,
            'service' => $validated['service'],
            'booking_date' => $validated['booking_date'],
            'booking_time' => $validated['booking_time'],
            'notes' => $validated['notes'] ?? null,
            'inspo_image_id' => $inspoId,
            'status' => 'pending',
        ]);

        return redirect('/dashboard')->with('success', 'Booking requested!');
    }

    public function accept(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);

        abort_unless(
            $booking->status === 'pending',
            422,
            'This booking is no longer pending.'
        );

        $validated = $request->validate([
            'artist_message' => ['nullable', 'string', 'max:300'],
        ]);

        $booking->update([
            'status' => 'confirmed',
            'artist_message' => $validated['artist_message'] ?? null,
        ]);

        return back();
    }

    public function decline(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);

        abort_unless(
            $booking->status === 'pending',
            422,
            'This booking is no longer pending.'
        );

        $validated = $request->validate([
            'artist_message' => ['nullable', 'string', 'max:300'],
        ]);

        $booking->update([
            'status' => 'cancelled',
            'cancelled_by' => 'artist',
            'artist_message' => $validated['artist_message'] ?? null,
        ]);

        return back();
    }

    public function cancel(Request $request, Booking $booking)
    {
        $userId = $request->user()->id;

        abort_unless(
            $booking->client_id === $userId || $booking->artist_id === $userId,
            403
        );

        abort_unless(
            in_array($booking->status, ['pending', 'confirmed'], true),
            422,
            'This booking can no longer be cancelled.'
        );

        $booking->update([
            'status' => 'cancelled',
            'cancelled_by' => $booking->client_id === $userId ? 'client' : 'artist',
        ]);

        return back();
    }

    /**
     * Client asks for a new date/time. The booking goes back to "pending"
     * so the artist has to approve the new slot.
     */
    public function reschedule(Request $request, Booking $booking)
    {
        abort_unless($booking->client_id === $request->user()->id, 403);

        $currentStart = Carbon::parse("{$booking->booking_date} {$booking->booking_time}");

        $allowed = $booking->status === 'pending'
            || ($booking->status === 'confirmed'
                && $currentStart->gt(now()->addHours(self::CHANGE_CUTOFF_HOURS)));

        abort_unless($allowed, 422, 'This booking can no longer be rescheduled.');

        $validated = $request->validate([
            'booking_date' => ['required', 'date', 'after_or_equal:today'],
            'booking_time' => ['required', 'date_format:H:i,H:i:s'],
        ]);

        $newStart = Carbon::parse("{$validated['booking_date']} {$validated['booking_time']}");

        abort_if($newStart->isPast(), 422, 'Please pick a time in the future.');

        if ($this->slotTaken($booking->artist_id, $validated['booking_date'], $validated['booking_time'], $booking->id)) {
            throw ValidationException::withMessages([
                'booking_time' => 'That time is already taken. Please choose a different time.',
            ]);
        }

        $booking->update([
            'booking_date' => $validated['booking_date'],
            'booking_time' => $validated['booking_time'],
            'status' => 'pending',
            // the old message belonged to the old slot
            'artist_message' => null,
        ]);

        return back();
    }

    /** Artist marks a confirmed session as done. */
    public function complete(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);

        abort_unless(
            $booking->status === 'confirmed',
            422,
            'Only confirmed bookings can be marked as completed.'
        );

        $booking->update(['status' => 'completed']);

        return back();
    }
}
