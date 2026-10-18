<?php

use App\Models\Booking;
use App\Models\User;
use App\Notifications\ArtistBookingUpdate;
use Illuminate\Support\Facades\Notification;

function makeQuotedBooking(): array
{
    $client = User::factory()->create(['role' => 'client']);
    $artist = User::factory()->create(['role' => 'artist']);
    $booking = Booking::create([
        'client_id' => $client->id,
        'artist_id' => $artist->id,
        'service' => 'Bridal Makeup',
        'booking_date' => now()->addMonth()->toDateString(),
        'booking_time' => '10:00:00',
        'status' => 'pending',
        'base_price' => 3500,
        'base_price_type' => 'starting_at',
        'estimated_total' => 4000,
        'selected_add_ons' => [[
            'id' => null,
            'name' => 'Metro Manila transportation (starting fee)',
            'price' => 500,
            'quantity' => 1,
            'line_total' => 500,
            'pricing_type' => 'fixed',
            'is_system_fee' => true,
        ]],
    ]);

    return [$client, $artist, $booking];
}

test('artist sends one itemized makeup and transportation quote for client approval', function () {
    Notification::fake();
    [$client, $artist, $booking] = makeQuotedBooking();

    $this->actingAs($artist)
        ->patch(route('bookings.quote', $booking), [
            'final_makeup_price' => 4000,
            'transportation_fee' => 800,
            'quote_reason' => 'The requested bridal look needs additional styling.',
        ])
        ->assertRedirect();

    $booking->refresh();
    expect((float) $booking->final_makeup_price)->toBe(4000.0)
        ->and((float) $booking->estimated_total)->toBe(4800.0)
        ->and($booking->quote_pending)->toBeTrue();

    Notification::assertSentTo($client, ArtistBookingUpdate::class, function (ArtistBookingUpdate $notification) use ($booking) {
        return $notification->toArray($booking->client)['event'] === 'quote_updated';
    });
});

test('makeup price increases require an artist explanation', function () {
    [, $artist, $booking] = makeQuotedBooking();

    $this->actingAs($artist)
        ->patch(route('bookings.quote', $booking), [
            'final_makeup_price' => 4000,
            'transportation_fee' => 500,
        ])
        ->assertSessionHasErrors('quote_reason');

    expect($booking->fresh()->quote_pending)->toBeFalse();
});

test('client approval starts the 50 percent deposit step and artist confirms after verifying it', function () {
    Notification::fake();
    [$client, $artist, $booking] = makeQuotedBooking();
    $booking->update([
        'final_makeup_price' => 4000,
        'estimated_total' => 4800,
        'quote_reason' => 'The requested bridal look needs additional styling.',
        'quote_pending' => true,
        'transportation_fee_pending' => true,
    ]);

    $this->actingAs($client)
        ->patch(route('bookings.quote.accept', $booking))
        ->assertRedirect();

    expect($booking->fresh()->deposit_status)->toBe('due')
        ->and($booking->fresh()->quote_accepted_at)->not->toBeNull();

    $this->actingAs($client)
        ->patch(route('bookings.deposit.submit', $booking), [
            'deposit_method' => 'cash',
            'deposit_reference' => 'Paid in cash',
        ])
        ->assertRedirect();

    expect($booking->fresh()->deposit_status)->toBe('submitted');

    $this->actingAs($artist)
        ->patch(route('bookings.deposit.received', $booking))
        ->assertRedirect();

    expect($booking->fresh()->deposit_status)->toBe('received');

    $this->actingAs($artist)
        ->patch(route('bookings.accept', $booking))
        ->assertRedirect();

    expect($booking->fresh()->status)->toBe('confirmed');
});

test('artist cannot confirm a booking before the client quote and deposit are complete', function () {
    [, $artist, $booking] = makeQuotedBooking();

    $this->actingAs($artist)
        ->patch(route('bookings.accept', $booking))
        ->assertUnprocessable();

    expect($booking->fresh()->status)->toBe('pending');
});
