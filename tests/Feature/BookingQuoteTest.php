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

test('artist can record partial and full balance payments and client sees the updated balance', function () {
    Notification::fake();
    [$client, $artist, $booking] = makeQuotedBooking();
    $booking->update([
        'estimated_total' => 4800,
        'quote_accepted_at' => now(),
        'deposit_status' => 'received',
        'deposit_amount' => 2400,
        'status' => 'confirmed',
    ]);

    $this->actingAs($artist)
        ->post(route('bookings.balance-payments.store', $booking), [
            'amount' => '1000.00',
            'method' => 'gcash',
            'reference' => 'GC-123',
            'paid_at' => now()->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect((float) $booking->balancePayments()->sum('amount'))->toBe(1000.0);

    Notification::assertSentTo($client, ArtistBookingUpdate::class, function (ArtistBookingUpdate $notification) use ($booking) {
        $data = $notification->toArray($booking->client);

        return $data['event'] === 'balance_payment_recorded'
            && str_contains($data['detail'], 'Remaining balance: ₱1,400.00');
    });

    $this->actingAs($artist)
        ->post(route('bookings.balance-payments.store', $booking), [
            'amount' => '1400.00',
            'method' => 'cash',
            'paid_at' => now()->toDateString(),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect((float) $booking->balancePayments()->sum('amount'))->toBe(2400.0);

    $this->actingAs($client)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/client')
            ->where('bookings.0.total_paid_amount', fn ($amount) => (float) $amount === 4800.0)
            ->where('bookings.0.remaining_balance', 0)
            ->has('bookings.0.balance_payments', 2));
});

test('artist cannot record a balance payment above the remaining amount', function () {
    [, $artist, $booking] = makeQuotedBooking();
    $booking->update([
        'estimated_total' => 4800,
        'quote_accepted_at' => now(),
        'deposit_status' => 'received',
        'deposit_amount' => 2400,
        'status' => 'confirmed',
    ]);

    $this->actingAs($artist)
        ->from(route('dashboard'))
        ->post(route('bookings.balance-payments.store', $booking), [
            'amount' => '2400.01',
            'method' => 'cash',
            'paid_at' => now()->toDateString(),
        ])
        ->assertSessionHasErrors('amount');

    expect($booking->balancePayments()->count())->toBe(0);
});
