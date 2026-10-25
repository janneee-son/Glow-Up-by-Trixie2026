<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->timestamp('appointment_reminder_sent_at')->nullable();
            $table->timestamp('deposit_reminder_sent_at')->nullable();
            $table->index(
                ['status', 'appointment_reminder_sent_at', 'booking_date'],
                'bookings_appointment_reminder_lookup_idx',
            );
            $table->index(
                ['status', 'deposit_status', 'quote_pending', 'deposit_reminder_sent_at', 'quote_accepted_at'],
                'bookings_deposit_reminder_lookup_idx',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('bookings_appointment_reminder_lookup_idx');
            $table->dropIndex('bookings_deposit_reminder_lookup_idx');
            $table->dropColumn(['appointment_reminder_sent_at', 'deposit_reminder_sent_at']);
        });
    }
};
