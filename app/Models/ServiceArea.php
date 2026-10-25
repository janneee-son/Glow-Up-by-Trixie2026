<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ServiceArea extends Model
{
    protected $fillable = [
        'artist_id',
        'name',
        'fee_group',
        'level',
        'starting_fee',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'starting_fee' => 'integer',
        ];
    }

    public function artist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'artist_id');
    }

    public static function resolveForAddress(User $artist, string $city, string $province, bool $lockForUpdate = false): ?self
    {
        $areas = self::query()
            ->where('artist_id', $artist->id)
            ->when($lockForUpdate, fn ($query) => $query->lockForUpdate())
            ->get();

        $normalize = static function (string $name): string {
            $name = Str::of(Str::ascii($name))->lower()->trim()->toString();
            $name = preg_replace('/^(city of|municipality of)\s+/', '', $name);

            return trim(preg_replace('/\s+(city|municipality)$/', '', $name));
        };
        $normalizedCity = $normalize($city);
        $normalizedProvince = $normalize($province);

        return $areas->first(fn (self $area): bool => $normalize($area->name) === $normalizedCity)
            ?? $areas->first(fn (self $area): bool => $normalize($area->name) === $normalizedProvince);
    }
}
