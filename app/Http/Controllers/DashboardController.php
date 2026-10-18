<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Review;
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
            $booking->loadMissing('balancePayments:id,booking_id,amount,method,reference,paid_at');
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
            $depositAmount = $booking->deposit_status === 'received'
                ? (float) ($booking->deposit_amount ?? 0)
                : 0;
            $balancePaymentsTotal = $booking->balancePayments->sum(fn ($payment) => (float) $payment->amount);
            $booking->total_paid_amount = round($depositAmount + $balancePaymentsTotal, 2);
            $booking->remaining_balance = $booking->estimated_total === null
                ? null
                : max(0, round((float) $booking->estimated_total - $booking->total_paid_amount, 2));

            return $booking;
        };

        if ($user->role === 'client') {
            $bookings = Booking::where('client_id', $user->id)
                ->with('artist:id,name,phone,specialty', 'package:id,description,inclusions', 'inspoImage:id,user_id,path', 'review:id,booking_id,rating,comment,is_approved')
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

            $reviews = $user->role === 'artist'
                ? Review::where('artist_id', $user->id)
                    ->with('client:id,name', 'booking:id,service,booking_date')
                    ->latest()
                    ->get(['id', 'booking_id', 'client_id', 'artist_id', 'rating', 'comment', 'is_approved', 'created_at'])
                : collect();

            return Inertia::render('dashboard/artist', [
                'bookings' => $bookings,
                'reviews' => $reviews,
            ]);
        }

        if ($user->role === 'admin') {
            return Inertia::render('dashboard/admin');
        }

        return Inertia::render('dashboard');
    }
}
