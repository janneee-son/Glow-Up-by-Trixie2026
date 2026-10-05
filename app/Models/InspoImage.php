<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InspoImage extends Model
{
    protected $fillable = ['user_id', 'path', 'caption'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}