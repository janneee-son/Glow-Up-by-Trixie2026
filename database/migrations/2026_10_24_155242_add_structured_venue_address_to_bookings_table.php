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
            $table->string('service_province', 100)->nullable()->after('service_area_level');
            $table->string('venue_barangay', 150)->nullable()->after('venue_address');
            $table->string('venue_street', 500)->nullable()->after('venue_barangay');
            $table->string('venue_landmark', 255)->nullable()->after('venue_street');
            $table->decimal('venue_latitude', 10, 7)->nullable()->after('venue_landmark');
            $table->decimal('venue_longitude', 10, 7)->nullable()->after('venue_latitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'service_province',
                'venue_barangay',
                'venue_street',
                'venue_landmark',
                'venue_latitude',
                'venue_longitude',
            ]);
        });
    }
};
