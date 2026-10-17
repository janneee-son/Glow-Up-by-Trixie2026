<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Review>
 */
class ReviewFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $client = User::factory()->create(['role' => 'client']);
        $artist = User::factory()->create(['role' => 'artist']);
        $booking = Booking::create([
            'client_id' => $client->id,
            'artist_id' => $artist->id,
            'service' => fake()->randomElement(['Bridal Makeup', 'Natural Glam', 'Special Event']),
            'booking_date' => fake()->date(),
            'booking_time' => '10:00:00',
            'status' => 'completed',
        ]);

        return [
            'booking_id' => $booking->id,
            'client_id' => $client->id,
            'artist_id' => $artist->id,
            'rating' => fake()->numberBetween(1, 5),
            'comment' => fake()->paragraph(),
            'is_approved' => false,
        ];
    }
}
