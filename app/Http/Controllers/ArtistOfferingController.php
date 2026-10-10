<?php

namespace App\Http\Controllers;

use App\Models\ArtistOffering;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ArtistOfferingController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizeArtist($request);

        $validated = $request->validate($this->rules($request));

        ArtistOffering::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'inclusions' => $validated['kind'] === 'package'
                ? ($validated['inclusions'] ?? [])
                : null,
            'add_on_min_quantity' => $validated['kind'] === 'add_on'
                ? $validated['add_on_min_quantity']
                : 1,
            'add_on_max_quantity' => $validated['kind'] === 'add_on'
                ? $validated['add_on_max_quantity']
                : 1,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Offering added.']);

        return back();
    }

    public function update(Request $request, ArtistOffering $offering): RedirectResponse
    {
        $this->authorizeOwner($request, $offering);

        $validated = $request->validate($this->rules($request, $offering));
        $validated['inclusions'] = $offering->kind === 'package'
            ? ($validated['inclusions'] ?? [])
            : null;
        $validated['add_on_min_quantity'] = $offering->kind === 'add_on'
            ? $validated['add_on_min_quantity']
            : 1;
        $validated['add_on_max_quantity'] = $offering->kind === 'add_on'
            ? $validated['add_on_max_quantity']
            : 1;

        $offering->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Offering updated.']);

        return back();
    }

    public function toggle(Request $request, ArtistOffering $offering): RedirectResponse
    {
        $this->authorizeOwner($request, $offering);

        $offering->update(['is_active' => ! $offering->is_active]);

        return back();
    }

    public function destroy(Request $request, ArtistOffering $offering): RedirectResponse
    {
        $this->authorizeOwner($request, $offering);
        $offering->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Offering deleted.']);

        return back();
    }

    private function rules(Request $request, ?ArtistOffering $offering = null): array
    {
        $allowedKinds = $offering ? [$offering->kind] : ['package', 'add_on'];

        return [
            'kind' => ['required', Rule::in($allowedKinds)],
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('artist_offerings', 'name')
                    ->where('user_id', $request->user()->id)
                    ->where('kind', $offering?->kind ?? $request->input('kind'))
                    ->ignore($offering?->id),
            ],
            'price' => ['nullable', 'numeric', 'min:0', 'max:1000000', 'required_unless:pricing_type,quote_required'],
            'pricing_type' => ['required', Rule::in(['fixed', 'starting_at', 'quote_required'])],
            'description' => ['nullable', 'string', 'max:500'],
            'inclusions' => ['nullable', 'array', 'max:20'],
            'inclusions.*' => ['required', 'string', 'max:160'],
            'add_on_min_quantity' => ['required_if:kind,add_on', 'nullable', 'integer', 'min:1', 'max:50', 'lte:add_on_max_quantity'],
            'add_on_max_quantity' => ['required_if:kind,add_on', 'nullable', 'integer', 'min:1', 'max:50', 'gte:add_on_min_quantity'],
        ];
    }

    private function authorizeArtist(Request $request): void
    {
        abort_unless($request->user()?->role === 'artist', 403);
    }

    private function authorizeOwner(Request $request, ArtistOffering $offering): void
    {
        $this->authorizeArtist($request);
        abort_unless($offering->user_id === $request->user()->id, 403);
    }
}
