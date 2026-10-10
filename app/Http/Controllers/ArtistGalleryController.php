<?php

namespace App\Http\Controllers;

use App\Models\ArtistGalleryImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;


class ArtistGalleryController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorizeAdmin($request);

        $images = ArtistGalleryImage::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (ArtistGalleryImage $image) => [
                'id' => $image->id,
                'caption' => $image->caption,
                'image_url' => Storage::url($image->path),
            ]);

        return Inertia::render('gallery/index', [
            'images' => $images,
        ]);
    }
    private function authorizeAdmin(Request $request): void
{
    abort_unless($request->user()?->role === 'artist', 403);
}

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'caption' => ['nullable', 'string', 'max:160'],
        ]);

        ArtistGalleryImage::create([
            'user_id' => $request->user()->id,
            'path' => $request->file('image')->store('artist-gallery', 'public'),
            'caption' => $validated['caption'] ?? null,
        ]);

        return back()->with('success', 'Gallery photo added.');
    }

    public function destroy(
        Request $request,
        ArtistGalleryImage $image
    ): RedirectResponse {
        $this->authorizeAdmin($request);

        abort_unless($image->user_id === $request->user()->id, 403);

        Storage::disk('public')->delete($image->path);
        $image->delete();

        return back()->with('success', 'Gallery photo deleted.');
    }

    private function authorizeArtist(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}