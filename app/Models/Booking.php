<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Booking extends Model
{
    protected $fillable = [
        'client_id',
        'artist_id',
        'service',
        'booking_date',
        'booking_time',
        'status',
        'notes',
        'inspo_image_id',
        'artist_message',
        'cancelled_by',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function artist()
    {
        return $this->belongsTo(User::class, 'artist_id');
    }

    public function inspoImage()
    {
        return $this->belongsTo(InspoImage::class);
    }
}