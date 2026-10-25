<?php

namespace App\Http\Controllers;

use App\Models\ServiceArea;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class BookingAddressVerificationController extends Controller
{
    public function suggest(Request $request): JsonResponse
    {
        $client = $request->user();
        abort_unless($client instanceof User && $client->role === 'client', 403);

        $artist = User::where('role', 'artist')->orderBy('id')->first();
        if (! $artist instanceof User) {
            abort(422, 'Bookings are not open yet.');
        }

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
        $results = $response->json('results', []);
        $results = is_array($results) ? $results : [];
        $suggestions = collect($results)
            ->filter(static fn (mixed $result): bool => is_array($result))
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
        $client = $request->user();
        abort_unless($client instanceof User && $client->role === 'client', 403);

        $artist = User::where('role', 'artist')->orderBy('id')->first();
        if (! $artist instanceof User) {
            abort(422, 'Bookings are not open yet.');
        }

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

        $lat = (float) $validated['venue_latitude'];
        $lng = (float) $validated['venue_longitude'];
        if ($lat === 0.0 && $lng === 0.0) {
            return response()->json(['verified' => false, 'message' => 'Please move the pin to the venue before confirming it.']);
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
            $response = Http::timeout(8)->get('https://api.geoapify.com/v1/geocode/search', [
                'text' => implode(', ', [
                    $validated['venue_street'],
                    $validated['venue_barangay'],
                    $validated['service_city'],
                    $validated['service_province'],
                    'Philippines',
                ]),
                'filter' => 'countrycode:ph',
                'format' => 'json',
                // Geocoders may return a nearby but less precise result first.
                // Inspect several candidates before deciding that the address
                // cannot be matched.
                'limit' => 5,
                'lang' => 'en',
                'apiKey' => $key,
            ]);
        } catch (\Throwable) {
            return response()->json(['verified' => false, 'message' => 'The address lookup service could not be reached. Please try again.'], 503);
        }

        if (! $response->successful()) {
            return response()->json(['verified' => false, 'message' => 'The address lookup service could not verify this address right now. Please try again.'], 503);
        }

        $results = $response->json('results', []);
        $results = is_array($results) ? $results : [];
        $selectedCity = $this->normalizeArea($validated['service_city']);
        $normalizeProvince = fn (?string $name): string => match ($this->normalizeArea($name)) {
            'ncr', 'national capital region' => 'metro manila',
            default => $this->normalizeArea($name),
        };
        $selectedProvince = $normalizeProvince($validated['service_province']);
        $hasCityMatch = false;
        $hasStreetMatch = false;
        $pinIsTooFar = false;
        $result = null;

        foreach ($results as $candidate) {
            if (! is_array($candidate)) {
                continue;
            }

            $areaNames = array_filter([
                $candidate['city'] ?? null,
                $candidate['county'] ?? null,
            ]);
            $areaMatches = in_array($selectedCity, array_map(fn (?string $name): string => $this->normalizeArea($name), $areaNames), true);
            $resultProvinces = array_filter([
                $candidate['county'] ?? null,
                $candidate['state'] ?? null,
                $candidate['state_code'] ?? null,
            ]);
            $provinceMatches = $resultProvinces === [] || in_array($selectedProvince, array_map($normalizeProvince, $resultProvinces), true);

            if (($candidate['country_code'] ?? null) !== 'ph' || ! $areaMatches || ! $provinceMatches) {
                continue;
            }

            $hasCityMatch = true;
            $rank = $candidate['rank'] ?? [];
            $confidence = $rank['confidence'] ?? null;
            $streetConfidence = $rank['confidence_street_level'] ?? null;
            $matchedStreet = $this->normalizeStreet($candidate['street'] ?? $candidate['address_line1'] ?? '');
            $enteredStreet = $this->normalizeStreet($validated['venue_street']);
            $streetMatches = $matchedStreet !== '' && str_contains($enteredStreet, $matchedStreet);

            if (! in_array($candidate['result_type'] ?? null, ['building', 'street'], true)
                || ! is_numeric($confidence)
                || (float) $confidence < 0.7
                || (is_numeric($streetConfidence) && (float) $streetConfidence < 0.7)
                || ! $streetMatches) {
                continue;
            }

            $hasStreetMatch = true;
            $resultLatitude = $candidate['lat'] ?? null;
            $resultLongitude = $candidate['lon'] ?? null;
            if (! is_numeric($resultLatitude) || ! is_numeric($resultLongitude)) {
                continue;
            }

            if ($this->distanceMeters($lat, $lng, (float) $resultLatitude, (float) $resultLongitude) > 250) {
                $pinIsTooFar = true;

                continue;
            }

            $result = $candidate;
            break;
        }

        if ($result === null && $pinIsTooFar) {
            return response()->json(['verified' => false, 'message' => 'The map pin is too far from the address Geoapify found. Move it closer to the address and try again.']);
        }

        $verifiedByPin = false;
        if ($result === null) {
            // Many Philippine streets and house numbers are missing from map
            // data. If text lookup cannot match them, verify the manually placed
            // pin against the selected city instead of blocking the booking.
            if (! $this->reserveDailyGeoapifyRequest()) {
                return response()->json([
                    'verified' => false,
                    'message' => 'Today’s address-check limit has been reached. Please try again tomorrow or contact Trixie.',
                ], 429);
            }

            try {
                $pinResponse = Http::timeout(8)->get('https://api.geoapify.com/v1/geocode/reverse', [
                    'lat' => $lat,
                    'lon' => $lng,
                    'format' => 'json',
                    'limit' => 1,
                    'lang' => 'en',
                    'apiKey' => $key,
                ]);
            } catch (\Throwable) {
                return response()->json(['verified' => false, 'message' => 'The map pin could not be checked right now. Please try again.'], 503);
            }

            if (! $pinResponse->successful()) {
                return response()->json(['verified' => false, 'message' => 'The map pin could not be checked right now. Please try again.'], 503);
            }

            $pinResults = $pinResponse->json('results', []);
            foreach (is_array($pinResults) ? $pinResults : [] as $candidate) {
                if (! is_array($candidate) || ($candidate['country_code'] ?? null) !== 'ph') {
                    continue;
                }

                $areaNames = array_filter([
                    $candidate['city'] ?? null,
                    $candidate['county'] ?? null,
                ]);
                $areaMatches = in_array($selectedCity, array_map(fn (?string $name): string => $this->normalizeArea($name), $areaNames), true);
                $resultProvinces = array_filter([
                    $candidate['county'] ?? null,
                    $candidate['state'] ?? null,
                    $candidate['state_code'] ?? null,
                ]);
                $provinceMatches = $resultProvinces === [] || in_array($selectedProvince, array_map($normalizeProvince, $resultProvinces), true);

                if (! $areaMatches || ! $provinceMatches) {
                    continue;
                }

                $result = $candidate;
                $verifiedByPin = true;
                break;
            }

            if ($result === null) {
                $message = $hasCityMatch || $hasStreetMatch
                    ? 'We could not verify this street or building. Check the address or choose a matching address suggestion.'
                    : 'We could not match this pin to the selected city. Check the address and try again.';

                return response()->json(['verified' => false, 'message' => $message]);
            }
        }

        $addressHash = self::addressHash(
            $client->id,
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
            'service_area_level' => $serviceArea->level ?? 'on_request',
            'formatted_address' => $formattedAddress,
            'lat' => $lat,
            'lng' => $lng,
        ]);

        return response()->json([
            'verified' => true,
            'formatted_address' => $formattedAddress,
            'map_url' => 'https://www.openstreetmap.org/?mlat='.$lat.'&mlon='.$lng.'#map=18/'.$lat.'/'.$lng,
            'service_area_level' => $serviceArea->level ?? 'on_request',
            'message' => $verifiedByPin
                ? 'The pin is in the selected city. Please make sure it marks the exact venue, since this street may not be listed on the map.'
                : 'The address matches the selected city and map pin. Your address is ready to use.',
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

    private function normalizeArea(?string $name): string
    {
        $name = Str::of(Str::ascii($name ?? ''))->lower()->trim()->toString();
        $name = preg_replace('/^(city of|municipality of)\s+/', '', $name);

        return trim(preg_replace('/\s+(city|municipality)$/', '', $name));
    }

    private function normalizeStreet(string $address): string
    {
        $address = Str::of(Str::ascii($address))->lower()->toString();
        $address = preg_replace('/^st\.?\s+/', 'saint ', $address);
        $address = preg_replace('/\bst\.?(?=,|$)/', 'street', $address);
        $address = preg_replace('/\bave\.?(?=\s|,|$)/', 'avenue', $address);
        $address = preg_replace('/\brd\.?(?=\s|,|$)/', 'road', $address);
        $address = preg_replace('/\bblvd\.?(?=\s|,|$)/', 'boulevard', $address);
        $address = preg_replace('/[^a-z0-9]+/', ' ', $address);

        return trim(preg_replace('/\s+/', ' ', $address));
    }

    private function distanceMeters(float $latitudeA, float $longitudeA, float $latitudeB, float $longitudeB): float
    {
        $earthRadius = 6_371_000;
        $latitudeDelta = deg2rad($latitudeB - $latitudeA);
        $longitudeDelta = deg2rad($longitudeB - $longitudeA);
        $distance = sin($latitudeDelta / 2) ** 2
            + cos(deg2rad($latitudeA)) * cos(deg2rad($latitudeB)) * sin($longitudeDelta / 2) ** 2;

        return $earthRadius * 2 * asin(sqrt($distance));
    }

    private function reserveDailyGeoapifyRequest(): bool
    {
        $dailyLimitKey = 'geoapify-address-requests:'.now()->toDateString();
        Cache::add($dailyLimitKey, 0, now()->endOfDay());

        return Cache::increment($dailyLimitKey) <= 2500;
    }
}
