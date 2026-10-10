<?php

namespace App\Http\Controllers;

use App\Models\ArtistService;
use App\Models\ArtistOffering;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ServiceController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorizeArtist($request);

        $services = ArtistService::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (ArtistService $s) => [
                'id' => $s->id,
                'name' => $s->name,
                'price' => (float) $s->price,
                'description' => $s->description,
                'is_active' => $s->is_active,
                'image_url' => $s->image ? Storage::url($s->image) : null,
            ]);

        $offerings = ArtistOffering::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (ArtistOffering $offering) => [
                'id' => $offering->id,
                'kind' => $offering->kind,
                'name' => $offering->name,
                'price' => $offering->price === null ? null : (float) $offering->price,
                'pricing_type' => $offering->pricing_type,
                'description' => $offering->description,
                'inclusions' => $offering->inclusions ?? [],
                'add_on_min_quantity' => $offering->add_on_min_quantity,
                'add_on_max_quantity' => $offering->add_on_max_quantity,
                'is_active' => $offering->is_active,
            ]);

        return Inertia::render('services/index', [
            'services' => $services,
            'packages' => $offerings->where('kind', 'package')->values(),
            'addOns' => $offerings->where('kind', 'add_on')->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizeArtist($request);

        $validated = $request->validate($this->rules($request));
        unset($validated['image'], $validated['remove_image']);

        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('services', 'public');
        }

        ArtistService::create([...$validated, 'user_id' => $request->user()->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Service added.']);

        return back();
    }

    public function update(Request $request, ArtistService $service): RedirectResponse
    {
        $this->authorizeOwner($request, $service);

        $validated = $request->validate($this->rules($request, $service));
        unset($validated['image'], $validated['remove_image']);

        if ($request->boolean('remove_image') && $service->image) {
            Storage::disk('public')->delete($service->image);
            $validated['image'] = null;
        } elseif ($request->hasFile('image')) {
            if ($service->image) {
                Storage::disk('public')->delete($service->image);
            }
            $validated['image'] = $request->file('image')->store('services', 'public');
        }

        $service->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Service updated.']);

        return back();
    }

    public function toggle(Request $request, ArtistService $service): RedirectResponse
    {
        $this->authorizeOwner($request, $service);

        $service->update(['is_active' => ! $service->is_active]);

        return back();
    }

    public function destroy(Request $request, ArtistService $service): RedirectResponse
    {
        $this->authorizeOwner($request, $service);

        if ($service->image) {
            Storage::disk('public')->delete($service->image);
        }
        $service->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Service deleted.']);

        return back();
    }

    private function rules(Request $request, ?ArtistService $service = null): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:100',
                "regex:/^[\pL\pN\s&'\/(),.\-]+$/u",
                Rule::unique('artist_services', 'name')
                    ->where('user_id', $request->user()->id)
                    ->ignore($service?->id),
            ],
            'price' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'description' => ['nullable', 'string', 'max:300'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_image' => ['nullable', 'boolean'],
        ];
    }

    private function authorizeArtist(Request $request): void
    {
        abort_unless($request->user()->role === 'artist', 403);
    }

    private function authorizeOwner(Request $request, ArtistService $service): void
    {
        $this->authorizeArtist($request);
        abort_unless($service->user_id === $request->user()->id, 403);
    }
}
