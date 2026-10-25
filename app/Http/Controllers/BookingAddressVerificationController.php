<?php

namespace App\Http\Controllers;

use App\Models\ServiceArea;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

$normalizeArea = static function (?string $name): string {
    $name = Str::of(Str::ascii($name ?? ''))->lower()->trim()->toString();
    $name = preg_replace('/^(city of|municipality of)\s+/', '', $name);

    return trim(preg_replace('/\s+city$/', '', $name));
};

class BookingAddressVerificationController extends Controller
{
    public function suggest(Request $request): JsonResponse
    {
        $artist = User::where('role', 'artist')->orderBy('id')->first();
        abort_unless($artist, 422, 'Bookings are not open yet.');

        $validated = $request->validate([
            'service_city' => ['required', 'string', 'max:100'],
            'query' => ['required', 'string', 'min:4', 'max:255'],
        ]);

        $serviceArea = ServiceArea::query()
            ->where('artist_id', $artist->id)
            ->where('name', $validated['service_city'])
            ->first();
        abort_unless($serviceArea && $serviceArea->level !== 'not_served', 422, 'This location is not accepting booking requests. Choose another area or contact Trixie.');

        $key = config('services.geoapify.geocoding_key');
        if (! filled($key)) {
            return response()->json([
                'suggestions' => [],
                'message' => 'Address suggestions are not configured yet. You can still enter the address and try the map check.',
            ], 503);
        }

        if (! $this->reserveDailyGeoapifyRequest()) {
            return response()->json([
                'suggestions' => [],
                'message' => 'Today’s address-search limit has been reached. Please try again tomorrow.',
            ], 429);
        }

        try {
            $response = Http::timeout(6)->get('https://api.geoapify.com/v1/geocode/autocomplete', [
                'text' => $validated['query'].', '.$serviceArea->name.', Philippines',
                'filter' => 'countrycode:ph',
                'format' => 'json',
                'limit' => 5,
                'lang' => 'en',
                'apiKey' => $key,
            ]);
        } catch (\Throwable) {
            return response()->json([
                'suggestions' => [],
                'message' => 'Address suggestions could not be loaded. You can still enter the full address manually.',
            ], 503);
        }

        if (! $response->successful()) {
            return response()->json([
                'suggestions' => [],
                'message' => 'Address suggestions could not be loaded. You can still enter the full address manually.',
            ], 503);
        }

        $normalizeArea = static function (?string $name): string {
            $name = mb_strtolower(trim($name ?? ''));
            $name = preg_replace('/^(city of|municipality of)\s+/i', '', $name);

            return trim(preg_replace('/\s+city$/i', '', $name));
        };
        $selectedArea = $normalizeArea($serviceArea->name);
        $suggestions = collect($response->json('results', []))
            ->filter(function (array $result) use ($normalizeArea, $selectedArea): bool {
                $resultAreas = array_filter([
                    $result['city'] ?? null,
                    $result['county'] ?? null,
                    $result['state'] ?? null,
                ]);

                return in_array($selectedArea, array_map($normalizeArea, $resultAreas), true);
            })
            ->map(function (array $result): array {
                $addressParts = array_filter([
                    $result['address_line1'] ?? null,
                    $result['address_line2'] ?? null,
                ], fn ($part): bool => filled($part));

                return [
                    'value' => $addressParts === []
                        ? (string) ($result['formatted'] ?? '')
                        : implode(', ', $addressParts),
                    'label' => (string) ($result['formatted'] ?? implode(', ', $addressParts)),
                    'result_type' => (string) ($result['result_type'] ?? 'address'),
                ];
            })
            ->filter(fn (array $suggestion): bool => $suggestion['value'] !== '')
            ->unique('value')
            ->values();

        return response()->json(['suggestions' => $suggestions]);
    }

    public function verify(Request $request): JsonResponse
    {
        $artist = User::where('role', 'artist')->orderBy('id')->first();
        abort_unless($artist, 422, 'Bookings are not open yet.');

        $validated = $request->validate([
            'service_city' => ['required', 'string', 'max:100'],
            'service_province' => ['required', 'string', 'max:100'],
            'venue_barangay' => ['required', 'string', 'max:150'],
            'venue_street' => ['required', 'string', 'min:3', 'max:500'],
            'venue_landmark' => ['nullable', 'string', 'max:255'],
            'venue_latitude' => ['required', 'numeric', 'between:-90,90'],
            'venue_longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $serviceArea = ServiceArea::resolveForAddress($artist, $validated['service_city'], $validated['service_province']);
        if ($serviceArea?->level === 'not_served') {
            return response()->json(['verified' => false, 'message' => 'Trixie is not accepting bookings in this area. Choose another city or contact her.'], 422);
        }

        $key = config('services.geoapify.geocoding_key');
        if (! filled($key)) {
            return response()->json([
                'verified' => false,
                'message' => 'Address lookup is not configured yet. Please contact Trixie before booking.',
            ], 503);
        }

        // Stay below the provider's free daily quota; fail closed instead of allowing overuse.
        if (! $this->reserveDailyGeoapifyRequest()) {
            return response()->json([
                'verified' => false,
                'message' => 'Today’s address-check limit has been reached. Please try again tomorrow or contact Trixie.',
            ], 429);
        }

        try {
            $response = Http::timeout(8)->get('https://api.geoapify.com/v1/geocode/reverse', [
                'lat' => $validated['venue_latitude'],
                'lon' => $validated['venue_longitude'],
                'filter' => 'countrycode:ph',
                'format' => 'json',
                'limit' => 1,
                'lang' => 'en',
                'apiKey' => $key,
            ]);
        } catch (\Throwable) {
            return response()->json(['verified' => false, 'message' => 'The address lookup service could not be reached. Please try again.'], 503);
        }

        if (! $response->successful()) {
            return response()->json(['verified' => false, 'message' => 'The address lookup service could not verify this address right now. Please try again.'], 503);
        }

        $result = collect($response->json('results', []))->first();
        if (! is_array($result)) {
            return response()->json(['verified' => false, 'message' => 'We could not check this pin. Move it slightly and try again.']);
        }

        $normalizeArea = static function (?string $name): string {
            $name = mb_strtolower(trim($name ?? ''));
            $name = preg_replace('/^(city of|municipality of)\s+/i', '', $name);

            return trim(preg_replace('/\s+city$/i', '', $name));
        };
        $selectedCity = $normalizeArea($validated['service_city']);
        $areaNames = array_filter([
            $result['city'] ?? null,
            $result['county'] ?? null,
        ]);
        $areaMatches = in_array($selectedCity, array_map($normalizeArea, $areaNames), true);
        $isPhilippines = ($result['country_code'] ?? null) === 'ph';

        if (! $isPhilippines || ! $areaMatches) {
            return response()->json(['verified' => false, 'message' => 'The pin must be inside the selected city or municipality. Move it and confirm again.']);
        }

        $lat = (float) $validated['venue_latitude'];
        $lng = (float) $validated['venue_longitude'];
        if ($lat === 0.0 && $lng === 0.0) {
            return response()->json(['verified' => false, 'message' => 'Please move the pin to the venue before confirming it.']);
        }

        $addressHash = self::addressHash(
            $request->user()->id,
            $validated['service_province'],
            $validated['service_city'],
            $validated['venue_barangay'],
            $validated['venue_street'],
            $validated['venue_landmark'] ?? '',
            $lat,
            $lng,
        );
        $formattedAddress = implode(', ', array_filter([
            $validated['venue_street'],
            $validated['venue_barangay'],
            $validated['service_city'],
            $validated['service_province'],
        ]));
        $request->session()->put('booking_address_verification', [
            'hash' => $addressHash,
            'verified_at' => now()->timestamp,
            'service_area_level' => $serviceArea?->level ?? 'on_request',
            'formatted_address' => $formattedAddress,
            'lat' => $lat,
            'lng' => $lng,
        ]);

        return response()->json([
            'verified' => true,
            'formatted_address' => $formattedAddress,
            'map_url' => 'https://www.openstreetmap.org/?mlat='.$lat.'&mlon='.$lng.'#map=18/'.$lat.'/'.$lng,
            'service_area_level' => $serviceArea?->level ?? 'on_request',
            'message' => 'The pin is in the selected city. Your address is ready to use.',
        ]);
    }

    public static function addressHash(int $userId, string $province, string $city, string $barangay, string $street, string $landmark, float $latitude, float $longitude): string
    {
        $normalize = static fn (string $value): string => mb_strtolower(preg_replace('/\s+/', ' ', trim($value)));

        return hash('sha256', implode('|', [
            $userId,
            $normalize($province),
            $normalize($city),
            $normalize($barangay),
            $normalize($street),
            $normalize($landmark),
            number_format($latitude, 7, '.', ''),
            number_format($longitude, 7, '.', ''),
        ]));
    }

    private function reserveDailyGeoapifyRequest(): bool
    {
        $dailyLimitKey = 'geoapify-address-requests:'.now()->toDateString();
        Cache::add($dailyLimitKey, 0, now()->endOfDay());

        return Cache::increment($dailyLimitKey) <= 2500;
    }
}
