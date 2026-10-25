<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Notifications\BookingReminder;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

#[Signature('bookings:send-reminders')]
#[Description('Send booking appointment and deposit reminders')]
class SendBookingReminders extends Command
{
    public function handle(): int
    {
        $timezone = (string) config('booking.timezone', 'Asia/Manila');
        $localNow = Carbon::now($timezone);
        $appointmentDeadline = $localNow->copy()->addHours(24);
        $appointmentRemindersSent = 0;
        $depositRemindersSent = 0;

        Booking::query()
            ->with(['client:id,name,email', 'artist:id,name,email'])
            ->where('status', 'confirmed')
            ->whereNull('appointment_reminder_sent_at')
            ->whereBetween('booking_date', [
                $localNow->toDateString(),
                $appointmentDeadline->toDateString(),
            ])
            ->chunkById(100, function ($bookings) use (
                &$appointmentRemindersSent,
                $localNow,
                $appointmentDeadline,
                $timezone,
            ): void {
                foreach ($bookings as $booking) {
                    $appointmentAt = Carbon::parse(
                        "{$booking->booking_date} {$booking->booking_time}",
                        $timezone,
                    );

                    if ($appointmentAt->lessThanOrEqualTo($localNow)
                        || $appointmentAt->greaterThan($appointmentDeadline)
                        || ! $this->claimAppointmentReminder($booking)) {
                        continue;
                    }

                    $booking->setAttribute('appointment_reminder_sent_at', now());
                    $booking->client?->notify((new BookingReminder($booking, 'appointment'))->afterCommit());
                    $booking->artist?->notify((new BookingReminder($booking, 'appointment'))->afterCommit());
                    $appointmentRemindersSent++;
                }
            });

        Booking::query()
            ->with(['client:id,name,email', 'artist:id,name,email'])
            ->where('status', 'pending')
            ->where('quote_pending', false)
            ->where('deposit_status', 'due')
            ->whereNotNull('quote_accepted_at')
            ->where('quote_accepted_at', '<=', now()->subHours(24))
            ->whereNull('deposit_reminder_sent_at')
            ->chunkById(100, function ($bookings) use (&$depositRemindersSent): void {
                foreach ($bookings as $booking) {
                    if (! $this->claimDepositReminder($booking)) {
                        continue;
                    }

                    $booking->setAttribute('deposit_reminder_sent_at', now());
                    $booking->client?->notify((new BookingReminder($booking, 'deposit'))->afterCommit());
                    $depositRemindersSent++;
                }
            });

        $this->info("Queued {$appointmentRemindersSent} appointment and {$depositRemindersSent} deposit reminders.");

        return self::SUCCESS;
    }

    private function claimAppointmentReminder(Booking $booking): bool
    {
        return Booking::query()
            ->whereKey($booking->id)
            ->where('status', 'confirmed')
            ->where('booking_date', $booking->booking_date)
            ->where('booking_time', $booking->booking_time)
            ->whereNull('appointment_reminder_sent_at')
            ->update(['appointment_reminder_sent_at' => now()]) === 1;
    }

    private function claimDepositReminder(Booking $booking): bool
    {
        return Booking::query()
            ->whereKey($booking->id)
            ->where('status', 'pending')
            ->where('quote_pending', false)
            ->where('deposit_status', 'due')
            ->where('quote_accepted_at', $booking->quote_accepted_at)
            ->whereNull('deposit_reminder_sent_at')
            ->update(['deposit_reminder_sent_at' => now()]) === 1;
    }
}
