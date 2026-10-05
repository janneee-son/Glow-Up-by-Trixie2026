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
            $path = $file->store('inspo', 'public');
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

        Storage::disk('public')->delete($image->path);
        $image->delete();

        return back();
    }

    /**
     * Let an artist view a client's inspiration history —
     * only if they share at least one booking together.
     */
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
            'url' => Storage::url($img->path),
            'caption' => $img->caption,
        ]);
    }
}