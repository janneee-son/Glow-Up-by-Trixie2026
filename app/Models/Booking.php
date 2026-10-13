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
        'location_type',
        'venue_address',
        'package_id',
        'base_price',
        'base_price_type',
        'estimated_total',
        'selected_add_ons',
        'requires_quote',
        'transportation_fee_pending',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'estimated_total' => 'decimal:2',
            'selected_add_ons' => 'array',
            'requires_quote' => 'boolean',
            'transportation_fee_pending' => 'boolean',
        ];
    }

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

    public function package()
    {
        return $this->belongsTo(ArtistOffering::class, 'package_id');
    }
}
