<?php

namespace App\Http\Controllers;

use App\Models\ServiceArea;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class ArtistAvailabilityController extends Controller
{
    public function edit(Request $request)
    {
        $artist = $this->managedArtist($request);

        return Inertia::render('artist/booking-settings', [
            'blockedDates' => $artist->blocked_booking_dates ?? [],
            'serviceAreas' => $artist->serviceAreas()
                ->orderBy('fee_group')
                ->orderBy('name')
                ->get(['id', 'name', 'fee_group', 'level', 'starting_fee', 'note']),
        ]);
    }

    private function managedArtist(Request $request): User
    {
        abort_unless(in_array($request->user()->role, ['artist', 'admin'], true), 403);

        $artist = $request->user()->role === 'artist'
            ? $request->user()
            : User::artist();

        abort_unless($artist, 404, 'The studio artist account has not been set up yet.');

        return $artist;
    }

    public function update(Request $request): RedirectResponse
    {
        $artist = $this->managedArtist($request);

        $validated = $request->validate([
            'blocked_dates' => ['present', 'array', 'max:100'],
            'blocked_dates.*' => ['required', 'date_format:Y-m-d', 'distinct', 'after_or_equal:today'],
        ]);

        $artist->update([
            'blocked_booking_dates' => collect($validated['blocked_dates'])->unique()->sort()->values()->all(),
        ]);

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

        if (! collect($validated['service_areas'])->contains(fn (array $area): bool => $area['level'] !== 'not_served')) {
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
