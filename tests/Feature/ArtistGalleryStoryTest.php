<?php

use App\Models\ArtistGalleryImage;
use App\Models\User;

test('artist can save a caption and story for a gallery photo', function () {
    $artist = User::factory()->create(['role' => 'artist']);
    $image = ArtistGalleryImage::create([
        'user_id' => $artist->id,
        'path' => 'artist-gallery/look.jpg',
    ]);

    $this->actingAs($artist)
        ->patch(route('admin.gallery.update', $image), [
            'caption' => 'Soft evening glam',
            'story' => 'A soft look created for an evening celebration.',
        ])
        ->assertRedirect();

    expect($image->fresh()->caption)->toBe('Soft evening glam')
        ->and($image->fresh()->story)->toBe('A soft look created for an evening celebration.');
});

test('artist cannot edit another artist’s gallery photo', function () {
    $owner = User::factory()->create(['role' => 'artist']);
    $otherArtist = User::factory()->create(['role' => 'artist']);
    $image = ArtistGalleryImage::create([
        'user_id' => $owner->id,
        'path' => 'artist-gallery/look.jpg',
    ]);

    $this->actingAs($otherArtist)
        ->patch(route('admin.gallery.update', $image), [
            'caption' => 'Changed',
            'story' => 'Changed story.',
        ])
        ->assertForbidden();

    expect($image->fresh()->caption)->toBeNull()
        ->and($image->fresh()->story)->toBeNull();
});
