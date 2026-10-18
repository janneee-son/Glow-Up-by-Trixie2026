<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('deposit_amount', 10, 2)->nullable();
        });

        DB::table('bookings')
            ->where('deposit_status', 'received')
            ->whereNotNull('estimated_total')
            ->update(['deposit_amount' => DB::raw('ROUND(estimated_total / 2, 2)')]);
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('deposit_amount');
        });
    }
};
