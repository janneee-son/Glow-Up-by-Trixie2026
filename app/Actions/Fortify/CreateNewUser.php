<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * Public registration only ever creates clients. The single artist/admin
     * account is created by the database seeder.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\s\'-]+$/u'],
            'phone' => ['required', 'string', 'max:15', 'regex:/^\+?[0-9\s]+$/'],
            'street_address' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
            // Philippine postal codes are 4 digits
            'postal_code' => ['required', 'string', 'regex:/^[0-9]{4}$/'],
            'password' => $this->passwordRules(),
        ])->validate();

        return User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'role' => 'client',
            'phone' => $input['phone'],
            'street_address' => $input['street_address'],
            'barangay' => $input['barangay'],
            'city' => $input['city'],
            'province' => $input['province'],
            'postal_code' => $input['postal_code'],
            'password' => $input['password'],
        ]);
    }
}
