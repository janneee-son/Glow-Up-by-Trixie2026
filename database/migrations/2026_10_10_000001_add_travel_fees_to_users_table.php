<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('metro_manila_travel_fee')->default(500);
            $table->unsignedInteger('out_of_town_travel_fee')->default(1000);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['metro_manila_travel_fee', 'out_of_town_travel_fee']);
        });
    }
};
