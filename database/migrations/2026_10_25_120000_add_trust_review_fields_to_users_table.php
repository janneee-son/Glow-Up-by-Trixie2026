<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('identity_verified_at')->nullable();
            $table->timestamp('payment_account_verified_at')->nullable();
            $table->timestamp('trust_reviewed_at')->nullable();
            $table->unsignedBigInteger('trust_reviewed_by')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'identity_verified_at',
                'payment_account_verified_at',
                'trust_reviewed_at',
                'trust_reviewed_by',
            ]);
        });
    }
};
