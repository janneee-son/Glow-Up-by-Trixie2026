<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Attach the inspiration image URL to each booking.
        $withInspoUrl = function ($booking) {
            $booking->inspo_url = $booking->inspoImage
                ? Storage::url($booking->inspoImage->path)
                : null;

            return $booking;
        };

        if ($user->role === 'client') {
            $bookings = Booking::where('client_id', $user->id)
                ->with('artist:id,name,phone,specialty', 'inspoImage:id,path')
                ->orderBy('booking_date')
                ->orderBy('booking_time')
                ->get()
                ->map($withInspoUrl);

            return Inertia::render('dashboard/client', [
                'bookings' => $bookings,
            ]);
        }

       if (in_array($user->role, ['artist', 'admin'], true)) {
            $bookings = Booking::where('artist_id', $user->id)
                ->with('client:id,name,phone', 'inspoImage:id,path')
                ->orderBy('booking_date')
                ->orderBy('booking_time')
                ->get()
                ->map($withInspoUrl);

            return Inertia::render('dashboard/artist', [
                'bookings' => $bookings,
            ]);
        }

        if ($user->role === 'admin') {
            return Inertia::render('dashboard/admin');
        }

        return Inertia::render('dashboard');
    }
}
