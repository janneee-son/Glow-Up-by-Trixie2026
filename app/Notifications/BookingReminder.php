<?php

namespace App\Notifications;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class BookingReminder extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  'appointment'|'deposit'  $kind
     */
    public function __construct(
        private readonly Booking $booking,
        private readonly string $kind,
    ) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        $booking = Booking::query()
            ->select([
                'id',
                'status',
                'booking_date',
                'booking_time',
                'quote_pending',
                'quote_accepted_at',
                'deposit_status',
                'appointment_reminder_sent_at',
                'deposit_reminder_sent_at',
            ])
            ->find($this->booking->id);

        if ($booking === null) {
            return false;
        }

        if ($this->kind === 'appointment') {
            return $booking->status === 'confirmed'
                && $booking->booking_date === $this->booking->booking_date
                && $booking->booking_time === $this->booking->booking_time
                && $booking->appointment_reminder_sent_at !== null;
        }

        return $booking->status === 'pending'
            && ! $booking->quote_pending
            && $booking->deposit_status === 'due'
            && $booking->quote_accepted_at !== null
            && $this->booking->quote_accepted_at !== null
            && $booking->quote_accepted_at->equalTo($this->booking->quote_accepted_at)
            && $booking->deposit_reminder_sent_at !== null;
    }

    /** @return array<string, int|string> */
    public function toArray(object $notifiable): array
    {
        $content = $this->content($notifiable);

        return [
            'event' => $this->kind === 'appointment' ? 'appointment_reminder' : 'deposit_reminder',
            'title' => $content['title'],
            'detail' => $content['detail'],
            'booking_id' => $this->booking->id,
            'client_name' => $this->booking->client?->name ?? 'A client',
            'artist_name' => $this->booking->artist?->name ?? 'Your artist',
            'service' => $this->booking->service,
            'booking_date' => $this->booking->booking_date,
            'booking_time' => $this->booking->booking_time,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $content = $this->content($notifiable);
        $recipientName = $notifiable instanceof User ? $notifiable->name : 'there';

        return (new MailMessage)
            ->subject($content['title'])
            ->greeting('Hello '.$recipientName.',')
            ->line($content['detail'])
            ->line('Service: '.$this->booking->service)
            ->line('Date and time: '.$this->scheduledAt())
            ->action('View booking', url('/dashboard#booking-'.$this->booking->id))
            ->salutation('Glow Up by Trixie');
    }

    /** @return array{title: string, detail: string} */
    private function content(object $notifiable): array
    {
        $isClient = $notifiable instanceof User && $notifiable->role === 'client';
        $clientName = $this->booking->client?->name ?? 'A client';
        $artistName = $this->booking->artist?->name ?? 'your artist';

        if ($this->kind === 'deposit') {
            $depositAmount = number_format((float) ($this->booking->estimated_total ?? 0) / 2, 2);

            return [
                'title' => 'Your booking deposit is due',
                'detail' => 'Your accepted quote still has a 50% deposit of ₱'.$depositAmount.' due. Submit it from My Bookings to move your booking forward.',
            ];
        }

        return [
            'title' => 'Appointment coming up',
            'detail' => $isClient
                ? 'Your appointment with '.$artistName.' is within the next 24 hours.'
                : 'Your appointment with '.$clientName.' is within the next 24 hours.',
        ];
    }

    private function scheduledAt(): string
    {
        $timezone = (string) config('booking.timezone', 'Asia/Manila');

        return Carbon::parse(
            "{$this->booking->booking_date} {$this->booking->booking_time}",
            $timezone,
        )->format('l, F j, Y \a\t g:i A');
    }
}
