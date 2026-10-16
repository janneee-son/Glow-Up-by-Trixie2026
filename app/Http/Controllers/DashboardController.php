<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Attach the inspiration image URL to each booking.
        $withInspoUrl = function ($booking) use ($user) {
            $booking->loadMissing('inspoImage:id,user_id,path');
            $isBookingParty = ($user->role === 'client' && $booking->client_id === $user->id)
                || ($user->role === 'artist' && $booking->artist_id === $user->id);
            $isClientImage = $booking->inspoImage?->user_id === $booking->client_id;
            $booking->inspo_url = $isBookingParty
                && $isClientImage
                ? route('inspo.show', $booking->inspo_image_id)
                : null;
            $booking->makeHidden(['inspo_image_id', 'inspo_image']);
            $booking->deposit_proof_url = $booking->deposit_proof_path
                ? route('bookings.deposit.proof', $booking)
                : null;

            return $booking;
        };

        if ($user->role === 'client') {
            $bookings = Booking::where('client_id', $user->id)
                ->with('artist:id,name,phone,specialty', 'package:id,description,inclusions', 'inspoImage:id,user_id,path')
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
                ->with('client:id,name,phone', 'inspoImage:id,user_id,path')
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
