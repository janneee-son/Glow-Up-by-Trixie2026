<?php

use App\Http\Controllers\BookingAddressVerificationController;
use App\Models\ArtistService;
use App\Models\Booking;
use App\Models\User;

function createAvailabilityScenario(): array
{
    $client = User::factory()->create(['role' => 'client']);
    $artist = User::factory()->create(['role' => 'artist']);
    $service = ArtistService::create([
        'user_id' => $artist->id,
        'name' => 'Makeup Session',
        'price' => 2500,
        'is_active' => true,
    ]);

    return [$client, $artist, $service];
}

test('client can check an open date and time before requesting a booking', function () {
    [$client, , $service] = createAvailabilityScenario();
    $date = now()->addDays(10)->toDateString();

    $this->actingAs($client)
        ->getJson(route('bookings.availability', [
            'booking_date' => $date,
            'booking_time' => '10:00',
            'service' => $service->name,
        ]))
        ->assertOk()
        ->assertJsonPath('available', true);
});

test('availability check reports an overlapping booking', function () {
    [$client, $artist, $service] = createAvailabilityScenario();
    $date = now()->addDays(10)->toDateString();

    Booking::create([
        'client_id' => User::factory()->create(['role' => 'client'])->id,
        'artist_id' => $artist->id,
        'service' => $service->name,
        'booking_date' => $date,
        'booking_time' => '10:00:00',
        'status' => 'pending',
    ]);

    $this->actingAs($client)
        ->getJson(route('bookings.availability', [
            'booking_date' => $date,
            'booking_time' => '11:00',
            'service' => $service->name,
        ]))
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('message', 'That time conflicts with another booking. Please choose a different time.');
});

test('availability check reports when the usual daily booking limit is reached', function () {
    [$client, $artist, $service] = createAvailabilityScenario();
    $date = now()->addDays(10)->toDateString();

    foreach (['pending', 'confirmed'] as $status) {
        Booking::create([
            'client_id' => User::factory()->create(['role' => 'client'])->id,
            'artist_id' => $artist->id,
            'service' => $service->name,
            'booking_date' => $date,
            'booking_time' => $status === 'pending' ? '09:00:00' : '14:00:00',
            'status' => $status,
        ]);
    }

    $this->actingAs($client)
        ->getJson(route('bookings.availability', [
            'booking_date' => $date,
            'service' => $service->name,
        ]))
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('message', 'This date has reached the usual limit of two bookings. Please choose another date.');
});

test('availability check rejects an appointment that overlaps a blocked time', function () {
    [$client, $artist, $service] = createAvailabilityScenario();
    $date = now()->addDays(10)->toDateString();
    $artist->update(['blocked_booking_times' => [[
        'date' => $date,
        'start_time' => '12:00',
        'end_time' => '13:00',
        'note' => 'Class',
    ]]]);

    $this->actingAs($client)
        ->getJson(route('bookings.availability', [
            'booking_date' => $date,
            'booking_time' => '11:00',
            'service' => $service->name,
        ]))
        ->assertOk()
        ->assertJsonPath('available', false)
        ->assertJsonPath('message', 'That time overlaps with a time Trixie has blocked. Please choose another time.');
});

test('client cannot reschedule into an artist blocked time', function () {
    [$client, $artist] = [User::factory()->create(['role' => 'client']), User::factory()->create(['role' => 'artist'])];
    $date = now()->addDays(10)->toDateString();
    $booking = Booking::create([
        'client_id' => $client->id,
        'artist_id' => $artist->id,
        'service' => 'Makeup Session',
        'booking_date' => $date,
        'booking_time' => '09:00:00',
        'status' => 'pending',
    ]);
    $artist->update(['blocked_booking_times' => [[
        'date' => $date,
        'start_time' => '12:00',
        'end_time' => '13:00',
        'note' => 'Class',
    ]]]);

    $this->actingAs($client)
        ->patch(route('bookings.reschedule', $booking), [
            'booking_date' => $date,
            'booking_time' => '11:00',
        ])
        ->assertSessionHasErrors('booking_time');

    expect($booking->fresh()->booking_time)->toBe('09:00:00');
});

test('client cannot submit a booking that overlaps an artist blocked time', function () {
    [$client, $artist, $service] = createAvailabilityScenario();
    $date = now()->addDays(10)->toDateString();
    $venue = [
        'service_province' => 'Metro Manila',
        'service_city' => 'Makati',
        'venue_barangay' => 'Poblacion',
        'venue_street' => '123 Sample Street',
        'venue_landmark' => '',
        'venue_latitude' => 14.55,
        'venue_longitude' => 121.02,
    ];
    $artist->update(['blocked_booking_times' => [[
        'date' => $date,
        'start_time' => '12:00',
        'end_time' => '13:00',
        'note' => 'Class',
    ]]]);
    $addressHash = BookingAddressVerificationController::addressHash(
        $client->id,
        $venue['service_province'],
        $venue['service_city'],
        $venue['venue_barangay'],
        $venue['venue_street'],
        '',
        $venue['venue_latitude'],
        $venue['venue_longitude'],
    );

    $this->actingAs($client)
        ->withSession(['booking_address_verification' => [
            'hash' => $addressHash,
            'verified_at' => now()->timestamp,
            'service_area_level' => 'on_request',
        ]])
        ->post(route('bookings.store'), [
            'terms_accepted' => true,
            'terms_version' => '2026-10-15-v1',
            'service' => $service->name,
            'package_id' => null,
            'booking_date' => $date,
            'booking_time' => '11:00',
            ...$venue,
            'address_confirmed' => true,
        ])
        ->assertSessionHasErrors('booking_time');

    expect(Booking::query()->count())->toBe(0);
});

test('artist can save one-off unavailable time periods', function () {
    $artist = User::factory()->create(['role' => 'artist']);
    $date = now()->addDays(10)->toDateString();

    $this->actingAs($artist)
        ->patch(route('artist.availability.update'), [
            'blocked_dates' => [],
            'blocked_times' => [[
                'date' => $date,
                'start_time' => '12:00',
                'end_time' => '13:00',
                'note' => 'Class',
            ]],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($artist->fresh()->blocked_booking_times)->toBe([[
        'date' => $date,
        'start_time' => '12:00',
        'end_time' => '13:00',
        'note' => 'Class',
    ]]);
});

test('artist cannot save a time block with an end before its start', function () {
    $artist = User::factory()->create(['role' => 'artist']);

    $this->actingAs($artist)
        ->from(route('artist.booking-settings.edit'))
        ->patch(route('artist.availability.update'), [
            'blocked_dates' => [],
            'blocked_times' => [[
                'date' => now()->addDays(10)->toDateString(),
                'start_time' => '14:00',
                'end_time' => '13:00',
                'note' => 'Class',
            ]],
        ])
        ->assertSessionHasErrors('blocked_times.0.end_time');
});

test('artist cannot block a time that overlaps a pending appointment', function () {
    $artist = User::factory()->create(['role' => 'artist']);
    $date = now()->addDays(10)->toDateString();
    Booking::create([
        'client_id' => User::factory()->create(['role' => 'client'])->id,
        'artist_id' => $artist->id,
        'service' => 'Makeup Session',
        'booking_date' => $date,
        'booking_time' => '10:00:00',
        'status' => 'pending',
    ]);

    $this->actingAs($artist)
        ->from(route('artist.booking-settings.edit'))
        ->patch(route('artist.availability.update'), [
            'blocked_dates' => [],
            'blocked_times' => [[
                'date' => $date,
                'start_time' => '11:00',
                'end_time' => '12:00',
                'note' => 'Class',
            ]],
        ])
        ->assertSessionHasErrors('blocked_times.0');

    expect($artist->fresh()->blocked_booking_times)->toBeNull();
});
