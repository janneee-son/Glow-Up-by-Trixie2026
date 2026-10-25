<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArtistTrustReviewController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorizeAdmin($request);

        $artist = User::artist();

        return Inertia::render('trust-review', [
            'artist' => $artist ? [
                'name' => $artist->name,
                'email' => $artist->email,
                'is_verified' => $artist->hasVerifiedTrustProfile(),
                'identity_verified_at' => $artist->identity_verified_at?->toIso8601String(),
                'payment_account_verified_at' => $artist->payment_account_verified_at?->toIso8601String(),
                'last_reviewed_at' => $artist->trust_reviewed_at?->toIso8601String(),
                'last_reviewed_by' => $artist->trust_reviewed_by,
            ] : null,
        ]);
    }

    public function verify(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);
        $request->validate([
            'identity_checked' => ['required', 'accepted'],
            'payment_account_checked' => ['required', 'accepted'],
        ]);

        $artist = User::artist();
        abort_unless($artist instanceof User, 404, 'No artist profile is available to review.');

        $reviewedAt = now();
        $artist->forceFill([
            'identity_verified_at' => $reviewedAt,
            'payment_account_verified_at' => $reviewedAt,
            'trust_reviewed_at' => $reviewedAt,
            'trust_reviewed_by' => $request->user()->id,
        ])->save();

        return back()->with('success', 'Identity and payment account checks recorded.');
    }

    public function revoke(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $artist = User::artist();
        abort_unless($artist instanceof User, 404, 'No artist profile is available to review.');

        $artist->forceFill([
            'identity_verified_at' => null,
            'payment_account_verified_at' => null,
            'trust_reviewed_at' => now(),
            'trust_reviewed_by' => $request->user()->id,
        ])->save();

        return back()->with('success', 'The public trust badge has been removed.');
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403);
    }
}
