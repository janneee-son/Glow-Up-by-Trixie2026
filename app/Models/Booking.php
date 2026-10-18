<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'final_makeup_price',
        'quote_reason',
        'quote_pending',
        'quote_accepted_at',
        'deposit_status',
        'deposit_amount',
        'deposit_method',
        'deposit_reference',
        'deposit_proof_path',
        'deposit_received_at',
        'terms_version',
        'terms_text',
        'terms_accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'estimated_total' => 'decimal:2',
            'selected_add_ons' => 'array',
            'requires_quote' => 'boolean',
            'transportation_fee_pending' => 'boolean',
            'final_makeup_price' => 'decimal:2',
            'deposit_amount' => 'decimal:2',
            'quote_pending' => 'boolean',
            'quote_accepted_at' => 'datetime',
            'deposit_received_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
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

    public function review()
    {
        return $this->hasOne(Review::class);
    }

    public function balancePayments(): HasMany
    {
        return $this->hasMany(BookingBalancePayment::class)->orderBy('paid_at')->orderBy('id');
    }
}
