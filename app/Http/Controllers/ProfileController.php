<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('profile/edit', [
            'user' => [
                ...$user->only(
                    'name',
                    'email',
                    'phone',
                    'role',
                    'street_address',
                    'barangay',
                    'city',
                    'province',
                    'postal_code',
                    'specialty',
                    'years_experience',
                    'bio',
                ),
                'avatar_url' => $user->avatar ? Storage::url($user->avatar) : null,
            ],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $rules = [
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\s\'.-]+$/u'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9\s]+$/'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'remove_avatar' => ['nullable', 'boolean'],
        ];

        $presence = $user->role === 'artist' ? 'nullable' : 'required';

        $rules += [
            'street_address' => [$presence, 'string', 'max:255'],
            'barangay' => [$presence, 'string', 'max:100'],
            'city' => [$presence, 'string', 'max:100'],
            'province' => [$presence, 'string', 'max:100'],
            'postal_code' => [$presence, 'string', 'regex:/^[0-9]{4}$/'],
        ];

        if ($user->role === 'artist') {
            $rules += [
                'specialty' => ['nullable', 'string', 'max:100'],
                'years_experience' => ['nullable', 'integer', 'min:0', 'max:60'],
                'bio' => ['nullable', 'string', 'max:300'],
            ];
        }

        $validated = $request->validate($rules);
        unset($validated['avatar'], $validated['remove_avatar']);

        // Handle avatar separately — it's a file, not a plain column value.
        if ($request->boolean('remove_avatar') && $user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $validated['avatar'] = null;
        } elseif ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $validated['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profile updated.']);

        return back();
    }
}