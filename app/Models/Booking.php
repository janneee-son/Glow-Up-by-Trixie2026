<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property array<int, array<string, mixed>>|null $selected_add_ons
 * @property User|null $client
 * @property User|null $artist
 */
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
        'service_area_level',
        'service_province',
        'venue_address',
        'venue_barangay',
        'venue_street',
        'venue_landmark',
        'venue_latitude',
        'venue_longitude',
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
            'venue_latitude' => 'decimal:7',
            'venue_longitude' => 'decimal:7',
            'quote_pending' => 'boolean',
            'quote_accepted_at' => 'datetime',
            'deposit_received_at' => 'datetime',
            'terms_accepted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    /** @return BelongsTo<User, $this> */
    public function artist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'artist_id');
    }

    /** @return BelongsTo<InspoImage, $this> */
    public function inspoImage(): BelongsTo
    {
        return $this->belongsTo(InspoImage::class);
    }

    /** @return BelongsTo<ArtistOffering, $this> */
    public function package(): BelongsTo
    {
        return $this->belongsTo(ArtistOffering::class, 'package_id');
    }

    /** @return HasOne<Review, $this> */
    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }

    /** @return HasMany<BookingBalancePayment, $this> */
    public function balancePayments(): HasMany
    {
        return $this->hasMany(BookingBalancePayment::class)->orderBy('paid_at')->orderBy('id');
    }
}
