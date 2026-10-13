<?php

use App\Models\ArtistService;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('the landing page includes uploaded photos with active services', function () {
    Storage::fake('public');
    Storage::disk('public')->put('services/bridal.jpg', 'image contents');

    $artist = User::factory()->create(['role' => 'artist']);
    ArtistService::create([
        'user_id' => $artist->id,
        'name' => 'Bridal Make-up',
        'price' => 3500,
        'description' => 'Make up for the Bride only',
        'image' => 'services/bridal.jpg',
        'is_active' => true,
    ]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->where('services.0.name', 'Bridal Make-up')
            ->where('services.0.image_url', Storage::url('services/bridal.jpg'))
        );
});
