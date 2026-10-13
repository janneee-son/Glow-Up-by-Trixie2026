<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ArtistAnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->role === 'artist', 403);

        $artistId = $request->user()->id;
        $artistBookings = fn (): Builder => Booking::where('artist_id', $artistId);
        $activeBookings = fn (): Builder => $artistBookings()
            ->whereIn('status', ['pending', 'confirmed', 'completed']);

        $popularServices = $activeBookings()
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

        $monthStart = now()->startOfMonth();
        $today = now()->toDateString();
        $trendStart = CarbonImmutable::now()->startOfMonth()->subMonths(5);
        $monthlyTrend = collect(range(0, 5))
            ->map(function (int $offset) use ($artistId, $trendStart): array {
                $month = $trendStart->addMonths($offset);
                $start = $month->toDateString();
                $end = $month->endOfMonth()->toDateString();

                return [
                    'month' => $month->format('M'),
                    'bookings_count' => Booking::where('artist_id', $artistId)
                        ->whereIn('status', ['pending', 'confirmed', 'completed'])
                        ->whereBetween('booking_date', [$start, $end])
                        ->count(),
                ];
            });

        $statusCounts = collect(['pending', 'confirmed', 'completed', 'cancelled'])
            ->mapWithKeys(fn (string $status) => [$status => $artistBookings()->where('status', $status)->count()]);

        $nextBookings = $artistBookings()
            ->with('client:id,name')
            ->whereIn('status', ['pending', 'confirmed'])
            ->whereDate('booking_date', '>=', $today)
            ->orderBy('booking_date')
            ->orderBy('booking_time')
            ->limit(5)
            ->get()
            ->map(fn (Booking $booking) => [
                'id' => $booking->id,
                'service' => $booking->service,
                'client_name' => $booking->client?->name ?? 'Client',
                'booking_date' => $booking->booking_date,
                'booking_time' => $booking->booking_time,
                'status' => $booking->status,
                'estimated_total' => $booking->estimated_total === null ? null : (float) $booking->estimated_total,
            ]);

        $confirmedValueEstimate = $artistBookings()
            ->whereIn('status', ['confirmed', 'completed'])
            ->sum('estimated_total');

        return Inertia::render('artist/analytics', [
            'totalBookings' => $activeBookings()->count(),
            'thisMonthBookings' => $activeBookings()
                ->whereBetween('booking_date', [$monthStart->toDateString(), $monthStart->copy()->endOfMonth()->toDateString()])
                ->count(),
            'upcomingBookings' => $artistBookings()
                ->whereIn('status', ['pending', 'confirmed'])
                ->whereDate('booking_date', '>=', $today)
                ->count(),
            'pendingBookings' => $statusCounts['pending'],
            'confirmedBookings' => $statusCounts['confirmed'],
            'completedBookings' => $statusCounts['completed'],
            'cancelledBookings' => $statusCounts['cancelled'],
            'confirmedValueEstimate' => (float) $confirmedValueEstimate,
            'popularServices' => $popularServices,
            'monthlyTrend' => $monthlyTrend,
            'nextBookings' => $nextBookings,
        ]);
    }
}
