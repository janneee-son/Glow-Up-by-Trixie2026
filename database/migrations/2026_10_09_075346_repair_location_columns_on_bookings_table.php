<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('bookings', 'location_type')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->string('location_type')->default('home_service');
            });
        }

        if (! Schema::hasColumn('bookings', 'venue_address')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->string('venue_address', 1000)->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('bookings', 'venue_address')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropColumn('venue_address');
            });
        }

        if (Schema::hasColumn('bookings', 'location_type')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->dropColumn('location_type');
            });
        }
    }
};