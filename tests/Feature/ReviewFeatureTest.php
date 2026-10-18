<?php

use App\Models\Booking;
use App\Models\Review;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function makeReviewBooking(string $status = 'completed'): array
{
    $client = User::factory()->create(['role' => 'client']);
    $artist = User::factory()->create(['role' => 'artist']);
    $booking = Booking::create([
        'client_id' => $client->id,
        'artist_id' => $artist->id,
        'service' => 'Bridal Makeup',
        'booking_date' => now()->subDay()->toDateString(),
        'booking_time' => '10:00:00',
        'status' => $status,
    ]);

    return [$client, $artist, $booking];
}

test('only a client can review their completed booking and only once', function () {
    [$client, , $booking] = makeReviewBooking();
    $reviewData = ['rating' => 5, 'comment' => 'Trixie made me feel confident and beautiful.'];

    $this->actingAs($client)
        ->post(route('reviews.store', $booking), $reviewData)
        ->assertRedirect();

    expect(Review::where('booking_id', $booking->id)->count())->toBe(1)
        ->and($booking->fresh()->review->is_approved)->toBeFalse();

    $this->actingAs($client)
        ->post(route('reviews.store', $booking), $reviewData)
        ->assertStatus(409);

    $otherClient = User::factory()->create(['role' => 'client']);

    $this->actingAs($otherClient)
        ->post(route('reviews.store', $booking), $reviewData)
        ->assertForbidden();
});

test('clients cannot review a booking before it is completed', function () {
    [$client, , $booking] = makeReviewBooking('confirmed');

    $this->actingAs($client)
        ->post(route('reviews.store', $booking), [
            'rating' => 5,
            'comment' => 'Looking forward to the session.',
        ])
        ->assertStatus(422);

    expect(Review::where('booking_id', $booking->id)->exists())->toBeFalse();
});

test('only the artist can publish reviews and only approved reviews appear publicly', function () {
    [$client, $artist, $booking] = makeReviewBooking();
    $review = Review::create([
        'booking_id' => $booking->id,
        'client_id' => $client->id,
        'artist_id' => $artist->id,
        'rating' => 4,
        'comment' => 'A lovely experience from start to finish.',
    ]);

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page->where('reviews', []));

    $this->actingAs($client)
        ->patch(route('reviews.approval', $review), ['is_approved' => true])
        ->assertForbidden();

    $this->actingAs($artist)
        ->patch(route('reviews.approval', $review), ['is_approved' => true])
        ->assertRedirect();

    expect($review->fresh()->is_approved)->toBeTrue();

    $this->get(route('home'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('reviews.0.id', $review->id)
            ->where('reviews.0.client.name', $client->name)
            ->where('reviews.0.booking.service', $booking->service));
});
