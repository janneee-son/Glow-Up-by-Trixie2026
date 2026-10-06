<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('profile/edit', [
            'user' => $request->user()->only(
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
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $rules = [
            // letters (incl. ñ), spaces, apostrophes, hyphens and periods ("Ma. Cristina", "Jr.")
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\s\'.-]+$/u'],
            // allows "+63 917 123 4567" (16 chars with spaces)
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9\s]+$/'],
        ];

        // The artist's address is the studio address: optional for him, required for clients.
        $presence = $user->role === 'artist' ? 'nullable' : 'required';

        $rules += [
            'street_address' => [$presence, 'string', 'max:255'],
            'barangay' => [$presence, 'string', 'max:100'],
            'city' => [$presence, 'string', 'max:100'],
            'province' => [$presence, 'string', 'max:100'],
            // Philippine postal codes are 4 digits
            'postal_code' => [$presence, 'string', 'regex:/^[0-9]{4}$/'],
        ];

        if ($user->role === 'artist') {
            // The artist's public details, shown on the booking page. All optional.
            $rules += [
                'specialty' => ['nullable', 'string', 'max:100'],
                'years_experience' => ['nullable', 'integer', 'min:0', 'max:60'],
                'bio' => ['nullable', 'string', 'max:300'],
            ];
        }

        $user->update($request->validate($rules));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profile updated.']);

        return back();
    }
}
