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
            $table->decimal('final_makeup_price', 10, 2)->nullable();
            $table->text('quote_reason')->nullable();
            $table->boolean('quote_pending')->default(false);
            $table->timestamp('quote_accepted_at')->nullable();
            $table->string('deposit_status', 20)->default('not_due');
            $table->string('deposit_reference', 120)->nullable();
            $table->timestamp('deposit_received_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'final_makeup_price',
                'quote_reason',
                'quote_pending',
                'quote_accepted_at',
                'deposit_status',
                'deposit_reference',
                'deposit_received_at',
            ]);
        });
    }
};
