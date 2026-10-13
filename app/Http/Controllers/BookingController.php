<?php

namespace App\Http\Controllers;

use App\Models\ArtistOffering;
use App\Models\ArtistService;
use App\Models\Booking;
use App\Models\InspoImage;
use App\Models\User;
use App\Notifications\ArtistBookingUpdate;
use App\Notifications\NewBookingRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BookingController extends Controller
{
    /** Clients may change a confirmed booking only if it is further away than this. */
    private const CHANGE_CUTOFF_HOURS = 24;

    private const MAX_DAILY_BOOKINGS = 2;

    private const RUSH_BOOKING_DAYS = 7;

    private const RUSH_BOOKING_FEE = 500;

    private const EARLY_CALL_TIME_FEE = 500;

    private const DEFAULT_METRO_MANILA_TRAVEL_FEE = 500;

    private const DEFAULT_OUT_OF_TOWN_TRAVEL_FEE = 1000;

    private const METRO_MANILA_CITIES = [
        'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong', 'Manila',
        'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque', 'Pasay', 'Pasig',
        'Quezon City', 'San Juan', 'Taguig', 'Valenzuela', 'Pateros',
    ];

    private const NEARBY_PROVINCE_DESTINATIONS = ['Cavite', 'Tagaytay', 'Bulacan'];

    /** The one artist (and admin) of the studio. */
    private function theArtist(): ?User
    {
        return User::where('role', 'artist')->orderBy('id')->first();
    }

    /**
     * Is the artist already booked around this time?
     * Pending and confirmed bookings both block the slot.
     */
    private function slotTaken(
        int $artistId,
        string $date,
        string $time,
        string $serviceName,
        ?int $ignoreBookingId = null,
    ): bool {
        $start = Carbon::parse("{$date} {$time}");
        $end = $start->copy()->addMinutes($this->sessionDurationMinutes($serviceName));

        return Booking::where('artist_id', $artistId)
            ->whereDate('booking_date', $date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($ignoreBookingId, fn ($q) => $q->where('id', '!=', $ignoreBookingId))
            ->get(['booking_time', 'service'])
            ->contains(function ($other) use ($date, $start, $end) {
                $otherStart = Carbon::parse("{$date} {$other->booking_time}");
                $otherEnd = $otherStart->copy()->addMinutes($this->sessionDurationMinutes($other->service));

                return $start->lt($otherEnd) && $end->gt($otherStart);
            });
    }

    private function sessionDurationMinutes(string $serviceName): int
    {
        return preg_match('/bridal|wedding/i', $serviceName) === 1 ? 180 : 90;
    }

    private function allowsMultipleBookingsPerDay(string $serviceName): bool
    {
        return preg_match('/photo|event|debut|prenup|wedding/i', $serviceName) === 1;
    }

    private function dailyCapacityReached(
        int $artistId,
        string $date,
        string $serviceName,
        ?int $ignoreBookingId = null,
    ): bool {
        if ($this->allowsMultipleBookingsPerDay($serviceName)) {
            return false;
        }

        return Booking::where('artist_id', $artistId)
            ->whereDate('booking_date', $date)
            ->whereIn('status', ['pending', 'confirmed', 'completed'])
            ->when($ignoreBookingId, fn ($q) => $q->where('id', '!=', $ignoreBookingId))
            ->count() >= self::MAX_DAILY_BOOKINGS;
    }

    public function create(Request $request)
    {
        $artist = $this->theArtist();

        $inspoImages = InspoImage::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn ($img) => [
                'id' => $img->id,
                'url' => asset('storage/'.$img->path),
                'caption' => $img->caption,
            ]);

        $services = $artist
            ? ArtistService::where('user_id', $artist->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'description'])
                ->map(fn (ArtistService $service) => [
                    'id' => $service->id,
                    'name' => $service->name,
                    'price' => (float) $service->price,
                    'description' => $service->description,
                ])
            : collect();

        $offerings = $artist
            ? ArtistOffering::where('user_id', $artist->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn (ArtistOffering $offering) => [
                    'id' => $offering->id,
                    'kind' => $offering->kind,
                    'name' => $offering->name,
                    'price' => $offering->price === null ? null : (float) $offering->price,
                    'pricing_type' => $offering->pricing_type,
                    'description' => $offering->description,
                    'inclusions' => $offering->inclusions ?? [],
                    'add_on_min_quantity' => $offering->add_on_min_quantity,
                    'add_on_max_quantity' => $offering->add_on_max_quantity,
                ])
            : collect();

        return Inertia::render('bookings/create', [
            'artist' => $artist
                ? $artist->only('id', 'name', 'specialty', 'years_experience', 'bio')
                : null,
            'inspoImages' => $inspoImages,
            'services' => $services,
            'packages' => $offerings->where('kind', 'package')->values(),
            'addOns' => $offerings->where('kind', 'add_on')->values(),
            'minimumBookingDate' => Carbon::today()->toDateString(),
            'rushBookingCutoffDate' => Carbon::today()->addDays(self::RUSH_BOOKING_DAYS)->toDateString(),
            'rushBookingFee' => self::RUSH_BOOKING_FEE,
            'earlyCallTimeFee' => self::EARLY_CALL_TIME_FEE,
            'metroManilaTravelFee' => (int) ($artist?->metro_manila_travel_fee ?? self::DEFAULT_METRO_MANILA_TRAVEL_FEE),
            'outOfTownTravelFee' => (int) ($artist?->out_of_town_travel_fee ?? self::DEFAULT_OUT_OF_TOWN_TRAVEL_FEE),
            'serviceCities' => [
                'metroManila' => self::METRO_MANILA_CITIES,
                'nearbyProvince' => self::NEARBY_PROVINCE_DESTINATIONS,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $artist = $this->theArtist();

        abort_unless($artist, 422, 'Bookings are not open yet.');

        $validated = $request->validate([
            'service' => [
                'nullable',
                'string',
                Rule::exists('artist_services', 'name')
                    ->where('user_id', $artist->id)
                    ->where('is_active', true),
            ],
            'package_id' => [
                'nullable',
                'integer',
                Rule::exists('artist_offerings', 'id')
                    ->where('user_id', $artist->id)
                    ->where('kind', 'package')
                    ->where('is_active', true),
            ],
            'add_on_quantities' => ['nullable', 'array', 'max:10'],
            'add_on_quantities.*' => ['required', 'integer', 'min:1', 'max:50'],
            'booking_date' => [
                'required',
                'date',
                'after_or_equal:today',
            ],
            'booking_time' => ['required', 'date_format:H:i,H:i:s'],
            'service_city' => ['required', 'string', Rule::in(array_merge(
                self::METRO_MANILA_CITIES,
                self::NEARBY_PROVINCE_DESTINATIONS,
            ))],
            'venue_address' => ['required', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:500'],
            'inspo_image_id' => [
                'nullable',
                Rule::exists('inspo_images', 'id')->where('user_id', $request->user()->id),
            ],
            'new_inspo_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
        ]);

        $hasService = filled($validated['service'] ?? null);
        $hasPackage = filled($validated['package_id'] ?? null);

        if ($hasService === $hasPackage) {
            throw ValidationException::withMessages([
                'service' => 'Choose one service or one package.',
                'package_id' => 'Choose one service or one package.',
            ]);
        }

        $package = $hasPackage
            ? ArtistOffering::where('user_id', $artist->id)->findOrFail($validated['package_id'])
            : null;
        $service = $hasService
            ? ArtistService::where('user_id', $artist->id)->where('name', $validated['service'])->firstOrFail()
            : null;
        $basePrice = $package?->price !== null
            ? (float) $package->price
            : ($service ? (float) $service->price : null);
        $basePriceType = $package?->pricing_type ?? 'fixed';

        $requestedQuantities = $validated['add_on_quantities'] ?? [];
        $selectedAddOnModels = ArtistOffering::where('user_id', $artist->id)
            ->where('kind', 'add_on')
            ->where('is_active', true)
            ->whereIn('id', array_keys($requestedQuantities))
            ->get()
            ->keyBy('id');

        if ($selectedAddOnModels->count() !== count($requestedQuantities)) {
            throw ValidationException::withMessages([
                'add_on_quantities' => 'One or more selected add-ons are no longer available.',
            ]);
        }

        foreach ($requestedQuantities as $addOnId => $quantity) {
            $addOn = $selectedAddOnModels->get((int) $addOnId);
            $quantity = (int) $quantity;
            $quantityLimitsApply = $addOn && $this->usesQuantityLimits($addOn->name);
            $minimumQuantity = $quantityLimitsApply ? $addOn->add_on_min_quantity : 1;
            $maximumQuantity = $quantityLimitsApply ? $addOn->add_on_max_quantity : 1;

            if (! $addOn || $quantity < $minimumQuantity || $quantity > $maximumQuantity) {
                throw ValidationException::withMessages([
                    "add_on_quantities.{$addOnId}" => $addOn
                        ? ($quantityLimitsApply
                            ? "Choose a quantity from {$minimumQuantity} to {$maximumQuantity}."
                            : 'This add-on can only be selected once.')
                        : 'This add-on is no longer available.',
                ]);
            }
        }

        $selectedAddOns = $selectedAddOnModels
            ->map(function (ArtistOffering $addOn) use ($requestedQuantities) {
                $quantity = (int) $requestedQuantities[$addOn->id];
                $unitPrice = $addOn->price === null ? null : (float) $addOn->price;

                return [
                    'id' => $addOn->id,
                    'name' => $addOn->name,
                    'price' => $unitPrice,
                    'quantity' => $quantity,
                    'line_total' => $unitPrice === null ? null : $unitPrice * $quantity,
                    'pricing_type' => $addOn->pricing_type,
                ];
            })
            ->values()
            ->all();

        $requiresQuote = $basePriceType === 'quote_required'
            || collect($selectedAddOns)->contains(fn (array $addOn) => $addOn['pricing_type'] === 'quote_required')
            || $validated['service_city'] !== '';
        $estimatedTotal = ($basePrice ?? 0)
            + collect($selectedAddOns)->sum(fn (array $addOn) => $addOn['line_total'] ?? 0);

        $bookingFees = $this->withBookingFees(
            $selectedAddOns,
            $estimatedTotal,
            $validated['booking_date'],
            $validated['booking_time'],
            $this->travelAreaForCity($validated['service_city']),
            (int) ($artist->metro_manila_travel_fee ?? self::DEFAULT_METRO_MANILA_TRAVEL_FEE),
            (int) ($artist->out_of_town_travel_fee ?? self::DEFAULT_OUT_OF_TOWN_TRAVEL_FEE),
        );
        $selectedAddOns = $bookingFees['selected_add_ons'];
        $estimatedTotal = $bookingFees['estimated_total'] ?? $estimatedTotal;

        if (Carbon::parse("{$validated['booking_date']} {$validated['booking_time']}")->isPast()) {
            throw ValidationException::withMessages([
                'booking_time' => 'Please pick a time in the future.',
            ]);
        }

        $serviceName = $package?->name ?? $service->name;

        if ($this->dailyCapacityReached($artist->id, $validated['booking_date'], $serviceName)) {
            throw ValidationException::withMessages([
                'booking_date' => 'The artist has reached the usual limit of two bookings for this day. Please choose another date.',
            ]);
        }

        if ($this->slotTaken($artist->id, $validated['booking_date'], $validated['booking_time'], $serviceName)) {
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

        $booking = Booking::create([
            'client_id' => $request->user()->id,
            'artist_id' => $artist->id,
            'service' => $serviceName,
            'package_id' => $package?->id,
            'base_price' => $basePrice,
            'base_price_type' => $basePriceType,
            'estimated_total' => $estimatedTotal,
            'selected_add_ons' => $selectedAddOns,
            'requires_quote' => $requiresQuote,
            'booking_date' => $validated['booking_date'],
            'booking_time' => $validated['booking_time'],
            'location_type' => $this->travelAreaForCity($validated['service_city']),
            'venue_address' => $validated['service_city'].' — '.$validated['venue_address'],
            'notes' => $validated['notes'] ?? null,
            'inspo_image_id' => $inspoId,
            'status' => 'pending',
        ]);

        $artist->notify(new NewBookingRequest($booking));

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

        abort_unless(
            ! $booking->transportation_fee_pending,
            422,
            'The client must accept the updated transportation fee first.'
        );

        $validated = $request->validate([
            'artist_message' => ['nullable', 'string', 'max:300'],
        ]);

        $booking->update([
            'status' => 'confirmed',
            'artist_message' => $validated['artist_message'] ?? null,
        ]);

        $booking->loadMissing('artist');
        $booking->artist?->notifications()
            ->where('type', NewBookingRequest::class)
            ->where('data->booking_id', $booking->id)
            ->delete();

        $booking->loadMissing('artist');
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'confirmed'));

        return back();
    }

    public function updateTransportationFee(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);
        abort_unless($booking->status === 'pending', 422, 'Only pending booking requests can be repriced.');

        $validated = $request->validate([
            'transportation_fee' => ['required', 'integer', 'min:0', 'max:1000000'],
        ]);

        $addOns = $booking->selected_add_ons ?? [];
        $transportIndex = null;
        foreach ($addOns as $index => $addOn) {
            if (($addOn['is_system_fee'] ?? false) && preg_match('/transportation/i', $addOn['name'] ?? '') === 1) {
                $transportIndex = $index;
                break;
            }
        }

        $newFee = (int) $validated['transportation_fee'];
        $oldFee = 0;
        if ($transportIndex !== null) {
            $oldFee = (float) ($addOns[$transportIndex]['line_total'] ?? $addOns[$transportIndex]['price'] ?? 0);
            if ((int) $oldFee === $newFee) {
                return back()->with('success', 'The transportation fee is already set to that amount.');
            }
            $addOns[$transportIndex]['price'] = $newFee;
            $addOns[$transportIndex]['line_total'] = $newFee;
        } else {
            $addOns[] = $this->systemFeeSnapshot(
                $booking->location_type === 'nearby_province'
                    ? 'Nearby-province transportation (starting fee)'
                    : 'Metro Manila transportation (starting fee)',
                $newFee,
            );
            $transportIndex = array_key_last($addOns);
        }

        $estimatedTotal = $booking->estimated_total === null
            ? null
            : max(0, (float) $booking->estimated_total - $oldFee + $newFee);

        $booking->update([
            'selected_add_ons' => $addOns,
            'estimated_total' => $estimatedTotal,
            'transportation_fee_pending' => true,
        ]);

        $booking->loadMissing('client', 'artist');
        $booking->client?->notifications()
            ->where('data->booking_id', $booking->id)
            ->where('data->event', 'travel_fee_updated')
            ->delete();
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'travel_fee_updated'));

        return back()->with('success', 'Updated transportation estimate sent to the client.');
    }

    public function acceptTransportationFee(Request $request, Booking $booking)
    {
        abort_unless($booking->client_id === $request->user()->id, 403);
        abort_unless($booking->status === 'pending', 422, 'This booking is no longer pending.');
        abort_unless($booking->transportation_fee_pending, 422, 'There is no updated transportation fee to accept.');

        $booking->update(['transportation_fee_pending' => false]);

        $booking->loadMissing('client', 'artist');
        $booking->client?->notifications()
            ->where('data->booking_id', $booking->id)
            ->where('data->event', 'travel_fee_updated')
            ->delete();
        $booking->artist?->notify(new ArtistBookingUpdate($booking, 'travel_fee_accepted'));

        return back()->with('success', 'Transportation estimate accepted. Trixie can now confirm your booking.');
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

        $this->clearBookingNotifications($booking);
        $booking->loadMissing('artist');
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'declined'));

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

        $this->clearBookingNotifications($booking);

        if ($booking->cancelled_by === 'artist') {
            $booking->loadMissing('artist');
            $booking->client?->notify(new ArtistBookingUpdate($booking, 'cancelled'));
        } else {
            $booking->loadMissing('client');
            $booking->artist?->notify(new ArtistBookingUpdate($booking, 'client_cancelled'));
        }

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

        if ($this->dailyCapacityReached($booking->artist_id, $validated['booking_date'], $booking->service, $booking->id)) {
            throw ValidationException::withMessages([
                'booking_date' => 'The artist has reached the usual limit of two bookings for this day. Please choose another date.',
            ]);
        }

        if ($this->slotTaken($booking->artist_id, $validated['booking_date'], $validated['booking_time'], $booking->service, $booking->id)) {
            throw ValidationException::withMessages([
                'booking_time' => 'That time is already taken. Please choose a different time.',
            ]);
        }

        $booking->update([
            'booking_date' => $validated['booking_date'],
            'booking_time' => $validated['booking_time'],
            'status' => 'pending',
            ...$this->withBookingFees(
                $booking->selected_add_ons ?? [],
                $booking->estimated_total === null ? null : (float) $booking->estimated_total,
                $validated['booking_date'],
                $validated['booking_time'],
                in_array($booking->location_type, ['metro_manila', 'nearby_province'], true)
                    ? $booking->location_type
                    : 'metro_manila',
                (int) ($booking->artist?->metro_manila_travel_fee ?? self::DEFAULT_METRO_MANILA_TRAVEL_FEE),
                (int) ($booking->artist?->out_of_town_travel_fee ?? self::DEFAULT_OUT_OF_TOWN_TRAVEL_FEE),
            ),
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

        $booking->loadMissing('artist');
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'completed'));

        return back();
    }

    private function usesQuantityLimits(string $name): bool
    {
        return preg_match('/bridesmaid|flower\s+girl/i', $name) === 1;
    }

    private function clearBookingNotifications(Booking $booking): void
    {
        $booking->loadMissing('artist', 'client');

        foreach ([$booking->artist, $booking->client] as $recipient) {
            $recipient?->notifications()
                ->where('data->booking_id', $booking->id)
                ->delete();
        }
    }

    private function travelAreaForCity(string $city): string
    {
        return in_array($city, self::NEARBY_PROVINCE_DESTINATIONS, true)
            ? 'nearby_province'
            : 'metro_manila';
    }

    private function withBookingFees(
        array $selectedAddOns,
        ?float $estimatedTotal,
        string $bookingDate,
        string $bookingTime,
        string $travelArea,
        int $metroManilaTravelFee,
        int $outOfTownTravelFee,
    ): array {
        $existingSystemFees = 0.0;
        $regularAddOns = [];

        foreach ($selectedAddOns as $addOn) {
            if ($addOn['is_system_fee'] ?? false) {
                $existingSystemFees += (float) ($addOn['line_total'] ?? 0);

                continue;
            }

            $regularAddOns[] = $addOn;
        }

        $rushFee = Carbon::parse($bookingDate)->startOfDay()->lt(
            Carbon::today()->addDays(self::RUSH_BOOKING_DAYS),
        ) ? self::RUSH_BOOKING_FEE : 0;
        $callTime = Carbon::parse($bookingTime)->format('H:i');
        $earlyCallTimeFee = $callTime >= '01:00' && $callTime <= '05:00'
            ? self::EARLY_CALL_TIME_FEE
            : 0;
        $travelFee = $travelArea === 'nearby_province'
            ? $outOfTownTravelFee
            : $metroManilaTravelFee;

        if ($rushFee > 0) {
            $regularAddOns[] = $this->systemFeeSnapshot('Rush booking fee', self::RUSH_BOOKING_FEE);
        }

        if ($earlyCallTimeFee > 0) {
            $regularAddOns[] = $this->systemFeeSnapshot('Early call time fee', self::EARLY_CALL_TIME_FEE);
        }

        $regularAddOns[] = $this->systemFeeSnapshot(
            $travelArea === 'nearby_province'
                ? 'Nearby-province transportation (starting fee)'
                : 'Metro Manila transportation (starting fee)',
            $travelFee,
        );

        return [
            'selected_add_ons' => $regularAddOns,
            'estimated_total' => $estimatedTotal === null
                ? null
                : $estimatedTotal - $existingSystemFees + $rushFee + $earlyCallTimeFee + $travelFee,
        ];
    }

    private function systemFeeSnapshot(string $name, int $amount): array
    {
        return [
            'id' => null,
            'name' => $name,
            'price' => $amount,
            'quantity' => 1,
            'line_total' => $amount,
            'pricing_type' => 'fixed',
            'is_system_fee' => true,
        ];
    }
}
