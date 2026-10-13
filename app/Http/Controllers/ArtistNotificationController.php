<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Notifications\NewBookingRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ArtistNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->role === 'artist', 403);

        $user = $request->user();

        $notifications = $user->notifications()->latest()->get();
        $bookingIds = $notifications->pluck('data.booking_id')->filter()->unique()->values();
        $bookingStatuses = Booking::whereIn('id', $bookingIds)->pluck('status', 'id');
        $visibleNotifications = $notifications->reject(function ($notification) use ($bookingStatuses) {
            if ($notification->type !== NewBookingRequest::class) {
                return false;
            }

            $bookingId = $notification->data['booking_id'] ?? null;

            return ! $bookingId || $bookingStatuses->get($bookingId) !== 'pending';
        })->values();

        return response()->json([
            'unread_count' => $visibleNotifications->whereNull('read_at')->count(),
            'notifications' => $visibleNotifications
                ->take(8)
                ->map(fn ($notification) => [
                    'id' => $notification->id,
                    'read_at' => $notification->read_at?->toIso8601String(),
                    'created_at' => $notification->created_at?->toIso8601String(),
                    ...$notification->data,
                ]),
        ]);
    }

    public function markRead(Request $request, string $notification): RedirectResponse
    {
        abort_unless($request->user()?->role === 'artist', 403);

        $request->user()->notifications()->whereKey($notification)->firstOrFail()->markAsRead();

        return back();
    }

    public function markAllRead(Request $request): RedirectResponse
    {
        abort_unless($request->user()?->role === 'artist', 403);

        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }
}
