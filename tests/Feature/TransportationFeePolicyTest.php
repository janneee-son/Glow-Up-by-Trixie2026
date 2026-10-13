<?php

use App\Models\Booking;
use App\Models\User;
use App\Notifications\ArtistBookingUpdate;
use Illuminate\Support\Facades\Notification;

function makeTransportationFeeBooking(): array
{
    $client = User::factory()->create(['role' => 'client']);
    $artist = User::factory()->create(['role' => 'artist']);
    $booking = Booking::create([
        'client_id' => $client->id,
        'artist_id' => $artist->id,
        'service' => 'Natural Glam',
        'booking_date' => now()->addMonth()->toDateString(),
        'booking_time' => '10:00:00',
        'status' => 'pending',
        'location_type' => 'metro_manila',
        'venue_address' => 'Unit 5B, Sample Building, Makati City',
        'selected_add_ons' => [[
            'id' => null,
            'name' => 'Metro Manila transportation (starting fee)',
            'price' => 500,
            'quantity' => 1,
            'line_total' => 500,
            'pricing_type' => 'fixed',
            'is_system_fee' => true,
        ]],
        'estimated_total' => 2999,
        'transportation_fee_pending' => false,
    ]);

    return [$client, $artist, $booking];
}

test('revised transportation fee updates the estimate and waits for the client', function () {
    Notification::fake();
    [, $artist, $booking] = makeTransportationFeeBooking();

    $this->actingAs($artist)
        ->patch(route('bookings.transportation-fee', $booking), ['transportation_fee' => 900])
        ->assertRedirect();

    $booking->refresh();
    expect($booking->transportation_fee_pending)->toBeTrue()
        ->and((float) $booking->estimated_total)->toBe(3399.0)
        ->and((int) $booking->selected_add_ons[0]['line_total'])->toBe(900);
});

test('client can accept an updated transportation estimate and the artist is notified', function () {
    Notification::fake();
    [$client, $artist, $booking] = makeTransportationFeeBooking();
    $booking->update(['transportation_fee_pending' => true]);

    $this->actingAs($client)
        ->patch(route('bookings.transportation-fee.accept', $booking))
        ->assertRedirect();

    expect($booking->fresh()->transportation_fee_pending)->toBeFalse();
    Notification::assertSentTo($artist, ArtistBookingUpdate::class, function (ArtistBookingUpdate $notification) use ($booking) {
        return $notification->toArray($booking->artist)['event'] === 'quote_accepted';
    });
});

test('artist cannot confirm a booking while the client decision is pending', function () {
    [, $artist, $booking] = makeTransportationFeeBooking();
    $booking->update(['transportation_fee_pending' => true]);

    $this->actingAs($artist)
        ->patch(route('bookings.accept', $booking))
        ->assertUnprocessable();

    expect($booking->fresh()->status)->toBe('pending');
});

test('only the booking client can accept its updated transportation estimate', function () {
    [, , $booking] = makeTransportationFeeBooking();
    $otherClient = User::factory()->create(['role' => 'client']);
    $booking->update(['transportation_fee_pending' => true]);

    $this->actingAs($otherClient)
        ->patch(route('bookings.transportation-fee.accept', $booking))
        ->assertForbidden();

    expect($booking->fresh()->transportation_fee_pending)->toBeTrue();
});

test('client can cancel if they do not agree with the updated fee', function () {
    Notification::fake();
    [$client, $artist, $booking] = makeTransportationFeeBooking();
    $booking->update(['transportation_fee_pending' => true]);

    $this->actingAs($client)
        ->patch(route('bookings.cancel', $booking))
        ->assertRedirect();

    expect($booking->fresh()->status)->toBe('cancelled')
        ->and($booking->fresh()->cancelled_by)->toBe('client');
    Notification::assertSentTo($artist, ArtistBookingUpdate::class, function (ArtistBookingUpdate $notification) use ($booking) {
        return $notification->toArray($booking->artist)['event'] === 'client_cancelled';
    });
});
