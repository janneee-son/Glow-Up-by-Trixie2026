<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ArtistBookingUpdate extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Booking $booking,
        private readonly string $event,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $titles = [
            'confirmed' => 'Booking confirmed',
            'declined' => 'Booking declined',
            'completed' => 'Session completed',
            'cancelled' => 'Booking cancelled by the artist',
            'client_cancelled' => 'Booking cancelled by the client',
            'travel_fee_updated' => 'Travel fee updated',
            'travel_fee_accepted' => 'Client accepted transportation fee',
            'quote_updated' => 'Final booking quote ready',
            'quote_accepted' => 'Client accepted the final quote',
            'deposit_submitted' => 'Client says deposit was sent',
            'deposit_received' => 'Deposit received',
        ];

        $travelFee = collect($this->booking->selected_add_ons ?? [])
            ->first(fn (array $item) => ($item['is_system_fee'] ?? false)
                && preg_match('/transportation/i', $item['name'] ?? '') === 1);

        $detail = match ($this->event) {
            'quote_updated' => 'Final makeup: ₱'.number_format((float) ($this->booking->final_makeup_price ?? 0))
                .' · Final total: ₱'.number_format((float) ($this->booking->estimated_total ?? 0))
                .($this->booking->quote_reason ? ' · '.$this->booking->quote_reason : ''),
            'quote_accepted' => 'The client accepted the final quote and owes a 50% deposit of ₱'
                .number_format((float) ($this->booking->estimated_total ?? 0) / 2, 2).'.',
            'deposit_submitted' => 'Payment reference or note: '.$this->booking->deposit_reference,
            'deposit_received' => 'Trixie verified your 50% deposit. The booking is ready for confirmation.',
            'travel_fee_updated' => 'Transportation: ₱'.number_format((float) ($travelFee['line_total'] ?? 0))
                .($this->booking->estimated_total === null
                    ? ''
                    : ' · New estimate: ₱'.number_format((float) $this->booking->estimated_total)),
            'travel_fee_accepted' => 'The client accepted the revised estimate. You can now review and confirm the booking.',
            default => null,
        };

        return [
            'event' => $this->event,
            'title' => $titles[$this->event] ?? 'Booking updated',
            'detail' => $detail,
            'booking_id' => $this->booking->id,
            'client_name' => $this->booking->client?->name ?? 'A client',
            'artist_name' => $this->booking->artist?->name ?? 'Your artist',
            'service' => $this->booking->service,
            'booking_date' => $this->booking->booking_date,
            'booking_time' => $this->booking->booking_time,
            'status' => $this->booking->status,
            'artist_message' => $this->booking->artist_message,
        ];
    }
}
