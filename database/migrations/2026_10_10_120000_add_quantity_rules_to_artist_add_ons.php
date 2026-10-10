<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('artist_offerings', function (Blueprint $table) {
            $table->unsignedSmallInteger('add_on_min_quantity')->default(1);
            $table->unsignedSmallInteger('add_on_max_quantity')->default(1);
        });
    }

    public function down(): void
    {
        Schema::table('artist_offerings', function (Blueprint $table) {
            $table->dropColumn(['add_on_min_quantity', 'add_on_max_quantity']);
        });
    }
};
