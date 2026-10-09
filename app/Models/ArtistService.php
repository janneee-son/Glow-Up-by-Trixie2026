<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArtistService extends Model
{
    protected $fillable = ['user_id', 'name', 'price', 'description', 'image', 'is_active'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}