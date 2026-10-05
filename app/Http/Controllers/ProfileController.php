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

        if ($user->role === 'artist') {
            // The artist's public details, shown on the booking page. All optional.
            $rules += [
                'specialty' => ['nullable', 'string', 'max:100'],
                'years_experience' => ['nullable', 'integer', 'min:0', 'max:60'],
                'bio' => ['nullable', 'string', 'max:300'],
            ];
        } else {
            $rules += [
                'street_address' => ['required', 'string', 'max:255'],
                'barangay' => ['required', 'string', 'max:100'],
                'city' => ['required', 'string', 'max:100'],
                'province' => ['required', 'string', 'max:100'],
                // Philippine postal codes are 4 digits
                'postal_code' => ['required', 'string', 'regex:/^[0-9]{4}$/'],
            ];
        }

        $user->update($request->validate($rules));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profile updated.']);

        return back();
    }
}
