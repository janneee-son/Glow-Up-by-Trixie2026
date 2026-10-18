<?php

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
