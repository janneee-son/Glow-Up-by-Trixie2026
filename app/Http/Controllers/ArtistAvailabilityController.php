<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\ServiceArea;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ArtistAvailabilityController extends Controller
{
    /** @return list<string> */
    private function normalizedBlockedDates(mixed $dates): array
    {
        if (! is_array($dates)) {
            return [];
        }

        $normalized = [];
        foreach ($dates as $date) {
            if (is_string($date)) {
                $normalized[] = $date;
            }
        }

        $normalized = array_values(array_unique($normalized));
        sort($normalized);

        return $normalized;
    }

    /** @return list<array{date: string, start_time: string, end_time: string, note: string}> */
    private function normalizedBlockedTimes(mixed $blockedTimes): array
    {
        if (! is_array($blockedTimes)) {
            return [];
        }

        $normalized = [];
        foreach ($blockedTimes as $blockedTime) {
            if (! is_array($blockedTime)
                || ! is_string($blockedTime['date'] ?? null)
                || ! is_string($blockedTime['start_time'] ?? null)
                || ! is_string($blockedTime['end_time'] ?? null)) {
                continue;
            }

            $normalized[] = [
                'date' => $blockedTime['date'],
                'start_time' => $blockedTime['start_time'],
                'end_time' => $blockedTime['end_time'],
                'note' => is_string($blockedTime['note'] ?? null) ? trim($blockedTime['note']) : '',
            ];
        }

        usort($normalized, static fn (array $left, array $right): int => [$left['date'], $left['start_time']] <=> [$right['date'], $right['start_time']]);

        return $normalized;
    }

    private function hasBookableServiceArea(mixed $serviceAreas): bool
    {
        if (! is_array($serviceAreas)) {
            return false;
        }

        foreach ($serviceAreas as $serviceArea) {
            if (is_array($serviceArea) && ($serviceArea['level'] ?? null) !== 'not_served') {
                return true;
            }
        }

        return false;
    }

    public function edit(Request $request): Response
    {
        $artist = $this->managedArtist($request);

        return Inertia::render('artist/booking-settings', [
            'blockedDates' => $artist->blocked_booking_dates ?? [],
            'blockedTimes' => $artist->blocked_booking_times ?? [],
            'serviceAreas' => $artist->serviceAreas()
                ->orderBy('fee_group')
                ->orderBy('name')
                ->get(['id', 'name', 'fee_group', 'level', 'starting_fee', 'note']),
        ]);
    }

    private function managedArtist(Request $request): User
    {
        $user = $request->user();
        abort_unless(
            $user instanceof User && in_array($user->role, ['artist', 'admin'], true),
            403,
        );

        $artist = $user->role === 'artist' ? $user : User::artist();

        if ($artist === null) {
            abort(404, 'The studio artist account has not been set up yet.');
        }

        return $artist;
    }

    public function update(Request $request): RedirectResponse
    {
        $artist = $this->managedArtist($request);

        $validated = $request->validate([
            'blocked_dates' => ['present', 'array', 'max:100'],
            'blocked_dates.*' => ['required', 'date_format:Y-m-d', 'distinct', 'after_or_equal:today'],
            'blocked_times' => ['present', 'array', 'max:100'],
            'blocked_times.*.date' => ['required', 'date_format:Y-m-d', 'after_or_equal:today'],
            'blocked_times.*.start_time' => ['required', 'date_format:H:i'],
            'blocked_times.*.end_time' => ['required', 'date_format:H:i'],
            'blocked_times.*.note' => ['nullable', 'string', 'max:100'],
        ]);

        foreach ($validated['blocked_times'] as $index => $blockedTime) {
            if (Carbon::createFromFormat('!H:i', $blockedTime['end_time']) <= Carbon::createFromFormat('!H:i', $blockedTime['start_time'])) {
                throw ValidationException::withMessages([
                    "blocked_times.{$index}.end_time" => 'The end time must be later than the start time.',
                ]);
            }
        }

        DB::transaction(function () use ($artist, $validated): void {
            User::query()->whereKey($artist->id)->lockForUpdate()->firstOrFail();

            foreach ($validated['blocked_times'] as $index => $blockedTime) {
                $blockedStart = Carbon::parse("{$blockedTime['date']} {$blockedTime['start_time']}");
                $blockedEnd = Carbon::parse("{$blockedTime['date']} {$blockedTime['end_time']}");
                $overlapsBooking = Booking::query()
                    ->where('artist_id', $artist->id)
                    ->whereDate('booking_date', $blockedTime['date'])
                    ->whereIn('status', ['pending', 'confirmed'])
                    ->get(['booking_date', 'booking_time', 'service'])
                    ->contains(function (Booking $booking) use ($blockedStart, $blockedEnd): bool {
                        $bookingStart = Carbon::parse("{$booking->booking_date} {$booking->booking_time}");
                        $durationMinutes = preg_match('/bridal|wedding/i', $booking->service) === 1 ? 180 : 90;
                        $bookingEnd = $bookingStart->copy()->addMinutes($durationMinutes);

                        return $bookingStart->lt($blockedEnd) && $bookingEnd->gt($blockedStart);
                    });

                if ($overlapsBooking) {
                    throw ValidationException::withMessages([
                        "blocked_times.{$index}" => 'This period overlaps a pending or confirmed booking. Reschedule or cancel the booking first.',
                    ]);
                }
            }

            $artist->update([
                'blocked_booking_dates' => $this->normalizedBlockedDates($validated['blocked_dates'] ?? null),
                'blocked_booking_times' => $this->normalizedBlockedTimes($validated['blocked_times'] ?? null),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Availability saved.']);

        return back();
    }

    public function updateServiceAreas(Request $request): RedirectResponse
    {
        $artist = $this->managedArtist($request);

        $validated = $request->validate([
            'service_areas' => ['present', 'array', 'max:150'],
            'service_areas.*.id' => ['nullable', 'integer', 'distinct'],
            'service_areas.*.name' => ['required', 'string', 'min:2', 'max:100', 'distinct:ignore_case'],
            'service_areas.*.fee_group' => ['required', Rule::in(['metro_manila', 'nearby_province'])],
            'service_areas.*.level' => ['required', Rule::in(['covered', 'on_request', 'not_served'])],
            'service_areas.*.starting_fee' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'service_areas.*.note' => ['nullable', 'string', 'max:255'],
        ]);

        if (! $this->hasBookableServiceArea($validated['service_areas'] ?? null)) {
            return back()->withErrors([
                'service_areas' => 'Keep at least one location set to Covered or On request.',
            ]);
        }

        DB::transaction(function () use ($artist, $validated): void {
            User::query()->whereKey($artist->id)->lockForUpdate()->firstOrFail();

            foreach ($validated['service_areas'] as $index => $area) {
                $values = [
                    'name' => trim($area['name']),
                    'fee_group' => $area['fee_group'],
                    'level' => $area['level'],
                    'starting_fee' => $area['starting_fee'] ?? null,
                    'note' => filled($area['note'] ?? null) ? trim($area['note']) : null,
                ];

                if (filled($area['id'] ?? null)) {
                    $serviceArea = ServiceArea::query()
                        ->where('artist_id', $artist->id)
                        ->whereKey($area['id'])
                        ->lockForUpdate()
                        ->firstOrFail();
                    $serviceArea->update($values);

                    continue;
                }

                $alreadyExists = $artist->serviceAreas()
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($values['name'])])
                    ->exists();

                if ($alreadyExists) {
                    throw ValidationException::withMessages([
                        "service_areas.{$index}.name" => 'This location is already in the service area list.',
                    ]);
                }

                $artist->serviceAreas()->create($values);
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Service areas saved.']);

        return back();
    }
}
