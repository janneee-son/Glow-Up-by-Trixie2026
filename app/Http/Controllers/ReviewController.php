<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, Booking $booking)
    {
        abort_unless($booking->client_id === $request->user()->id, 403);
        abort_unless($booking->status === 'completed', 422, 'You can review a session after it is completed.');
        abort_if($booking->review()->exists(), 409, 'This booking already has a review.');

        $validated = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'min:10', 'max:1200'],
        ]);

        Review::create([
            ...$validated,
            'booking_id' => $booking->id,
            'client_id' => $booking->client_id,
            'artist_id' => $booking->artist_id,
        ]);

        return back()->with('success', 'Thank you! Your review is waiting for Trixie’s approval.');
    }

    public function updateApproval(Request $request, Review $review)
    {
        abort_unless($request->user()->role === 'artist' && $review->artist_id === $request->user()->id, 403);

        $validated = $request->validate([
            'is_approved' => ['required', 'boolean'],
        ]);

        $review->update(['is_approved' => $validated['is_approved']]);

        return back()->with('success', $review->is_approved ? 'Review published.' : 'Review hidden from the homepage.');
    }
}
