<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Creates or updates the single artist account.
     * Set these in your .env file first:
     *   ARTIST_NAME="Full Name"
     *   ARTIST_EMAIL=artist@example.com
     *   ARTIST_PASSWORD=choose-a-strong-password
     * Optional: ARTIST_PHONE, ARTIST_SPECIALTY, ARTIST_BIO
     */
    public function run(): void
    {
        $name = env('ARTIST_NAME');
        $email = env('ARTIST_EMAIL');
        $password = env('ARTIST_PASSWORD');

        if (! $name || ! $email || ! $password) {
            $this->command?->warn('Skipped: set ARTIST_NAME, ARTIST_EMAIL and ARTIST_PASSWORD in .env first.');

            return;
        }

        $artist = User::firstOrNew(['email' => $email]);

        // forceFill so email_verified_at is saved (it is not mass-assignable).
        $artist->forceFill([
            'name' => $name,
            'role' => 'artist',
            'password' => $password, // hashed automatically by the model cast
            'email_verified_at' => now(),
            'phone' => env('ARTIST_PHONE', $artist->phone ?? ''),
            'specialty' => env('ARTIST_SPECIALTY', $artist->specialty),
            'bio' => env('ARTIST_BIO', $artist->bio),
        ])->save();

        $this->command?->info("Artist account ready: {$email}");
    }
}
