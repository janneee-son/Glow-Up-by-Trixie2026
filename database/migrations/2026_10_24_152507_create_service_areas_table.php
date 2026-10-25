<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('service_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('artist_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('fee_group', 30)->default('metro_manila');
            $table->string('level', 20)->default('covered');
            $table->unsignedInteger('starting_fee')->nullable();
            $table->string('note', 255)->nullable();
            $table->timestamps();
            $table->unique(['artist_id', 'name']);
            $table->index(['artist_id', 'level']);
        });

        $now = now();
        $artists = DB::table('users')->where('role', 'artist')->get(['id', 'booking_service_areas']);

        foreach ($artists as $artist) {
            $storedAreas = json_decode($artist->booking_service_areas ?? 'null', true);
            $groups = is_array($storedAreas)
                ? $storedAreas
                : [
                    'metroManila' => config('booking.service_areas.metro_manila', []),
                    'nearbyProvince' => config('booking.service_areas.nearby_province', []),
                ];
            $rows = [];
            $seen = [];

            foreach ([
                'metroManila' => 'metro_manila',
                'nearbyProvince' => 'nearby_province',
            ] as $group => $feeGroup) {
                foreach ($groups[$group] ?? [] as $name) {
                    $name = trim((string) $name);
                    $normalized = mb_strtolower($name);

                    if ($name === '' || isset($seen[$normalized])) {
                        continue;
                    }

                    $seen[$normalized] = true;
                    $rows[] = [
                        'artist_id' => $artist->id,
                        'name' => $name,
                        'fee_group' => $feeGroup,
                        'level' => 'covered',
                        'starting_fee' => null,
                        'note' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            if ($rows !== []) {
                DB::table('service_areas')->insert($rows);
            }
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('booking_service_areas');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('booking_service_areas')->nullable();
        });

        $areasByArtist = DB::table('service_areas')
            ->orderBy('artist_id')
            ->orderBy('name')
            ->get(['artist_id', 'name', 'fee_group', 'level'])
            ->groupBy('artist_id');

        foreach ($areasByArtist as $artistId => $areas) {
            DB::table('users')->where('id', $artistId)->update([
                'booking_service_areas' => json_encode([
                    'metroManila' => $areas->where('fee_group', 'metro_manila')->where('level', '!=', 'not_served')->pluck('name')->values(),
                    'nearbyProvince' => $areas->where('fee_group', 'nearby_province')->where('level', '!=', 'not_served')->pluck('name')->values(),
                ]),
            ]);
        }

        Schema::dropIfExists('service_areas');
    }
};
