<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property Carbon|null $identity_verified_at
 * @property Carbon|null $payment_account_verified_at
 * @property Carbon|null $trust_reviewed_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property array<int, string>|null $blocked_booking_dates
 * @property array<int, array{date: string, start_time: string, end_time: string, note?: string}>|null $blocked_booking_times
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['avatar', 'name', 'email', 'password', 'role', 'phone', 'specialty', 'years_experience', 'bio', 'street_address', 'barangay', 'city', 'province', 'postal_code', 'metro_manila_travel_fee', 'out_of_town_travel_fee', 'blocked_booking_dates', 'blocked_booking_times'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'identity_verified_at' => 'datetime',
            'payment_account_verified_at' => 'datetime',
            'trust_reviewed_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'blocked_booking_dates' => 'array',
            'blocked_booking_times' => 'array',
        ];
    }

    /** @return HasMany<ServiceArea, $this> */
    public function serviceAreas(): HasMany
    {
        return $this->hasMany(ServiceArea::class, 'artist_id');
    }

    public static function artist(): ?self
    {
        return static::where('role', 'artist')->orderBy('id')->first();
    }

    public function hasVerifiedTrustProfile(): bool
    {
        return $this->identity_verified_at !== null
            && $this->payment_account_verified_at !== null;
    }
}
