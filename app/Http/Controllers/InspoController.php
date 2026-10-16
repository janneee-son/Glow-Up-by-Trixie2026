<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\InspoImage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class InspoController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('inspo/index', [
            'images' => $this->formatImages(
                InspoImage::where('user_id', $request->user()->id)->latest()->get()
            ),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:10'],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'caption' => ['nullable', 'string', 'max:100'],
        ]);

        $created = [];
        foreach ($request->file('images') as $file) {
            $path = $file->store('inspo');
            $created[] = InspoImage::create([
                'user_id' => $request->user()->id,
                'path' => $path,
                'caption' => $validated['caption'] ?? null,
            ]);
        }

        return back();
    }

    public function destroy(Request $request, InspoImage $image)
    {
        abort_unless($image->user_id === $request->user()->id, 403);

        Storage::disk('local')->delete($image->path);
        Storage::disk('public')->delete($image->path);
        $image->delete();

        return back();
    }

    public function show(Request $request, InspoImage $image)
    {
        $isOwner = $image->user_id === $request->user()->id;
        $isAssignedArtist = $request->user()->role === 'artist'
            && Booking::where('artist_id', $request->user()->id)
                ->where('client_id', $image->user_id)
                ->exists();

        abort_unless($isOwner || $isAssignedArtist, 403);

        abort_unless(Storage::disk('local')->exists($image->path), 404);

        return Storage::disk('local')->response($image->path, null, ['Cache-Control' => 'private, no-store']);
    }

    public function showForClient(Request $request, User $client)
    {
        abort_unless($request->user()->role === 'artist', 403);

        $hasRelationship = Booking::where('artist_id', $request->user()->id)
            ->where('client_id', $client->id)
            ->exists();

        abort_unless($hasRelationship, 403, 'You do not have access to this client\'s inspiration history.');

        return Inertia::render('inspo/client-view', [
            'clientName' => $client->name,
            'images' => $this->formatImages(
                InspoImage::where('user_id', $client->id)->latest()->get()
            ),
        ]);
    }

    private function formatImages($images)
    {
        return $images->map(fn ($img) => [
            'id' => $img->id,
            'url' => route('inspo.show', $img),
            'caption' => $img->caption,
        ]);
    }
}
