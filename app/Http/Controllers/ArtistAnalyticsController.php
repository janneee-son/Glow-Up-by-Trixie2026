<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArtistAnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->role === 'artist', 403);

        $artistId = $request->user()->id;
        $countableBookings = fn () => Booking::where('artist_id', $artistId)
            ->whereIn('status', ['pending', 'confirmed', 'completed']);

        $popularServices = $countableBookings()
            ->selectRaw('service, COUNT(*) as bookings_count')
            ->groupBy('service')
            ->orderByDesc('bookings_count')
            ->orderBy('service')
            ->limit(10)
            ->get()
            ->map(fn (Booking $booking) => [
                'service' => $booking->service,
                'bookings_count' => (int) $booking->bookings_count,
            ]);

        return Inertia::render('artist/analytics', [
            'totalBookings' => $countableBookings()->count(),
            'thisMonthBookings' => $countableBookings()
                ->whereBetween('booking_date', [now()->startOfMonth()->toDateString(), now()->toDateString()])
                ->count(),
            'pendingBookings' => Booking::where('artist_id', $artistId)
                ->where('status', 'pending')
                ->count(),
            'popularServices' => $popularServices,
        ]);
    }
}
