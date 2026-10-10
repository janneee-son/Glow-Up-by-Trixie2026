<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('artist_offerings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 20);
            $table->string('name', 120);
            $table->decimal('price', 10, 2)->nullable();
            $table->string('pricing_type', 24)->default('fixed');
            $table->string('description', 500)->nullable();
            $table->json('inclusions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'kind', 'name']);
            $table->index(['user_id', 'kind', 'is_active']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('package_id')->nullable()->constrained('artist_offerings')->nullOnDelete();
            $table->decimal('base_price', 10, 2)->nullable();
            $table->string('base_price_type', 24)->default('fixed');
            $table->decimal('estimated_total', 10, 2)->nullable();
            $table->json('selected_add_ons')->nullable();
            $table->boolean('requires_quote')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['package_id']);
            $table->dropColumn([
                'package_id',
                'base_price',
                'base_price_type',
                'estimated_total',
                'selected_add_ons',
                'requires_quote',
            ]);
        });

        Schema::dropIfExists('artist_offerings');
    }
};
