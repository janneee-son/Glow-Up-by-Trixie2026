<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArtistOffering extends Model
{
    protected $fillable = [
        'user_id',
        'kind',
        'name',
        'price',
        'pricing_type',
        'description',
        'inclusions',
        'add_on_min_quantity',
        'add_on_max_quantity',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'inclusions' => 'array',
            'add_on_min_quantity' => 'integer',
            'add_on_max_quantity' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
