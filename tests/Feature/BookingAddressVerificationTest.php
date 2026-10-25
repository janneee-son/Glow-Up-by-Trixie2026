<?php

use App\Http\Controllers\BookingAddressVerificationController;
use App\Models\User;
use Illuminate\Support\Facades\Http;

function addressVerificationPayload(): array
{
    return [
        'service_city' => 'Makati City',
        'service_province' => 'Metro Manila',
        'venue_barangay' => 'San Lorenzo',
        'venue_street' => '123 Ayala Ave.',
        'venue_landmark' => 'Near the park',
        'venue_latitude' => 14.5547,
        'venue_longitude' => 121.0244,
    ];
}

function geoapifyAddressMatch(array $overrides = []): array
{
    return array_replace_recursive([
        'country_code' => 'ph',
        'state' => 'Metro Manila',
        'state_code' => 'NCR',
        'city' => 'Makati City',
        'street' => 'Ayala Avenue',
        'result_type' => 'building',
        'rank' => [
            'confidence' => 0.95,
            'confidence_street_level' => 0.92,
        ],
        'lat' => 14.5547,
        'lon' => 121.0244,
        'formatted' => '123 Ayala Avenue, Makati City, Metro Manila, Philippines',
    ], $overrides);
}

function fakeGeoapifyAddressSearch(array $result): void
{
    config(['services.geoapify.geocoding_key' => 'test-key']);

    Http::fake([
        'api.geoapify.com/v1/geocode/search*' => Http::response(['results' => [$result]], 200),
    ]);
}

test('client address verification requires a street-level match close to the map pin', function () {
    User::factory()->create(['role' => 'artist']);
    $client = User::factory()->create(['role' => 'client']);
    fakeGeoapifyAddressSearch(geoapifyAddressMatch());

    $response = $this->actingAs($client)
        ->postJson(route('bookings.verify-address'), addressVerificationPayload());

    $response->assertOk()
        ->assertJsonPath('verified', true)
        ->assertJsonPath('message', 'The address matches the selected city and map pin. Your address is ready to use.');

    expect(session('booking_address_verification.hash'))->toBe(BookingAddressVerificationController::addressHash(
        $client->id,
        'Metro Manila',
        'Makati City',
        'San Lorenzo',
        '123 Ayala Ave.',
        'Near the park',
        14.5547,
        121.0244,
    ));
});

test('address verification fails closed when Geoapify is not configured', function () {
    User::factory()->create(['role' => 'artist']);
    $client = User::factory()->create(['role' => 'client']);
    config(['services.geoapify.geocoding_key' => '']);

    $this->actingAs($client)
        ->postJson(route('bookings.verify-address'), addressVerificationPayload())
        ->assertServiceUnavailable()
        ->assertJsonPath('verified', false);

    expect(session()->has('booking_address_verification'))->toBeFalse();
});

test('address verification fails closed when Geoapify is unavailable', function () {
    User::factory()->create(['role' => 'artist']);
    $client = User::factory()->create(['role' => 'client']);
    config(['services.geoapify.geocoding_key' => 'test-key']);
    Http::fake(['api.geoapify.com/*' => Http::response([], 503)]);

    $this->actingAs($client)
        ->postJson(route('bookings.verify-address'), addressVerificationPayload())
        ->assertServiceUnavailable()
        ->assertJsonPath('verified', false);

    expect(session()->has('booking_address_verification'))->toBeFalse();
});

test('address verification rejects a city-level match or an unknown street', function () {
    User::factory()->create(['role' => 'artist']);
    $client = User::factory()->create(['role' => 'client']);
    fakeGeoapifyAddressSearch(geoapifyAddressMatch([
        'street' => 'Unknown Road',
        'result_type' => 'city',
        'rank' => [
            'confidence' => 0.4,
            'confidence_street_level' => 0.2,
        ],
    ]));

    $this->actingAs($client)
        ->postJson(route('bookings.verify-address'), addressVerificationPayload())
        ->assertOk()
        ->assertJsonPath('verified', false)
        ->assertJsonPath('message', 'We could not verify this street or building. Check the address or choose a matching address suggestion.');

    expect(session()->has('booking_address_verification'))->toBeFalse();
});

test('address verification rejects a map pin far from the matched address', function () {
    User::factory()->create(['role' => 'artist']);
    $client = User::factory()->create(['role' => 'client']);
    fakeGeoapifyAddressSearch(geoapifyAddressMatch([
        'lat' => 14.56,
        'lon' => 121.04,
    ]));

    $this->actingAs($client)
        ->postJson(route('bookings.verify-address'), addressVerificationPayload())
        ->assertOk()
        ->assertJsonPath('verified', false)
        ->assertJsonPath('message', 'The map pin is too far from the address Geoapify found. Move it closer to the address and try again.');

    expect(session()->has('booking_address_verification'))->toBeFalse();
});

test('artist accounts cannot access client booking and geocoding endpoints', function () {
    $artist = User::factory()->create(['role' => 'artist']);

    $this->actingAs($artist)
        ->get(route('bookings.create'))
        ->assertForbidden();

    $this->getJson(route('bookings.availability', ['booking_date' => now()->addDay()->toDateString()]))
        ->assertForbidden();

    $this->getJson(route('bookings.locations', ['level' => 'provinces']))
        ->assertForbidden();

    $this->getJson(route('bookings.map-center', [
        'service_city' => 'Makati City',
        'service_province' => 'Metro Manila',
    ]))->assertForbidden();

    $this->getJson(route('bookings.address-suggestions', [
        'service_city' => 'Makati City',
        'query' => '123 Ayala Avenue',
    ]))->assertForbidden();

    $this->postJson(route('bookings.verify-address'), addressVerificationPayload())
        ->assertForbidden();

    $this->post(route('bookings.store'))->assertForbidden();
});
