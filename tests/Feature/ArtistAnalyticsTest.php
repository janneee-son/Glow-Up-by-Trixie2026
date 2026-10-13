<?php

use App\Models\Booking;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('artist analytics summarizes bookings, demand, estimates, and upcoming appointments', function () {
    $artist = User::factory()->create(['role' => 'artist']);
    $client = User::factory()->create(['role' => 'client']);

    $createBooking = function (string $service, string $date, string $status, float $estimate) use ($artist, $client): Booking {
        return Booking::create([
            'client_id' => $client->id,
            'artist_id' => $artist->id,
            'service' => $service,
            'booking_date' => $date,
            'booking_time' => '10:00:00',
            'status' => $status,
            'estimated_total' => $estimate,
        ]);
    };

    $pending = $createBooking('Bridal Makeup', now()->toDateString(), 'pending', 3500);
    $createBooking('Bridal Makeup', now()->startOfMonth()->addMonth()->addDays(2)->toDateString(), 'confirmed', 5000);
    $createBooking('Natural Glam', now()->subMonth()->toDateString(), 'completed', 2499);
    $createBooking('Natural Glam', now()->startOfMonth()->addMonth()->addDays(2)->toDateString(), 'cancelled', 2499);

    $this->actingAs($artist)
        ->get(route('artist.analytics'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('artist/analytics')
            ->where('totalBookings', 3)
            ->where('thisMonthBookings', 1)
            ->where('upcomingBookings', 2)
            ->where('pendingBookings', 1)
            ->where('confirmedBookings', 1)
            ->where('completedBookings', 1)
            ->where('cancelledBookings', 1)
            ->where('confirmedValueEstimate', 7499)
            ->where('popularServices.0.service', 'Bridal Makeup')
            ->where('popularServices.0.bookings_count', 2)
            ->where('nextBookings.0.id', $pending->id)
            ->has('monthlyTrend', 6)
        );
});
