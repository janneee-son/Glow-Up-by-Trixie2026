<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewBookingRequest extends Notification
{
    use Queueable;

    public function __construct(private readonly Booking $booking)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New booking request',
            'booking_id' => $this->booking->id,
            'client_name' => $this->booking->client?->name ?? 'A client',
            'service' => $this->booking->service,
            'booking_date' => $this->booking->booking_date,
            'booking_time' => $this->booking->booking_time,
        ];
    }
}
