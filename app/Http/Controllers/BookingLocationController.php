<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class BookingLocationController extends Controller
{
    public function options(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'level' => ['required', 'in:provinces,cities,barangays'],
            'parent_code' => ['nullable', 'regex:/^\d{10}$/'],
        ]);

        $level = $validated['level'];
        $parentCode = $validated['parent_code'] ?? null;

        try {
            if ($level === 'provinces' && $parentCode === null) {
                $options = Cache::remember('psgc:v3:provinces', now()->addDays(30), function (): array {
                    $items = $this->fetchPsgc('provinces');
                    $items[] = ['code' => '1300000000', 'name' => 'Metro Manila'];

                    return $this->formatOptions($items);
                });
            } elseif ($level === 'cities' && $parentCode !== null) {
                $options = Cache::remember('psgc:v3:cities:'.$parentCode, now()->addDays(30), function () use ($parentCode): array {
                    $path = $parentCode === '1300000000'
                        ? 'regions/'.$parentCode.'/cities-municipalities'
                        : 'provinces/'.$parentCode.'/cities-municipalities';

                    return $this->formatOptions($this->fetchPsgc($path));
                });
            } elseif ($level === 'barangays' && $parentCode !== null) {
                $options = Cache::remember('psgc:v3:barangays:'.$parentCode, now()->addDays(30), function () use ($parentCode): array {
                    return $this->formatOptions($this->fetchPsgc('cities-municipalities/'.$parentCode.'/barangays'));
                });
            } else {
                return response()->json(['message' => 'Choose a province or city first.'], 422);
            }
        } catch (\Throwable) {
            return response()->json(['message' => 'The Philippine location list is temporarily unavailable. Please try again.'], 503);
        }

        return response()->json(['options' => $options]);
    }

    public function mapCenter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'service_city' => ['required', 'string', 'max:100'],
            'service_province' => ['required', 'string', 'max:100'],
        ]);

        $key = config('services.geoapify.geocoding_key');
        if (! filled($key)) {
            return response()->json(['message' => 'Map location lookup is not configured yet. Please contact Trixie.'], 503);
        }

        $cacheKey = 'geoapify-city-center:'.hash('sha256', mb_strtolower($validated['service_city'].'|'.$validated['service_province']));
        try {
            $result = Cache::remember($cacheKey, now()->addDays(30), function () use ($validated, $key): array {
                if (! $this->reserveDailyGeoapifyRequest()) {
                    throw new RuntimeException('Today’s address-check limit has been reached. Please try again tomorrow.');
                }

                $response = Http::timeout(8)->get('https://api.geoapify.com/v1/geocode/search', [
                    'text' => $validated['service_city'].', '.$validated['service_province'].', Philippines',
                    'filter' => 'countrycode:ph',
                    'format' => 'json',
                    'limit' => 1,
                    'lang' => 'en',
                    'apiKey' => $key,
                ]);

                if (! $response->successful()) {
                    throw new RuntimeException('The city could not be located right now. Please try again.');
                }

                return collect($response->json('results', []))->first() ?? [];
            });
        } catch (\Throwable $exception) {
            return response()->json(['message' => $exception instanceof RuntimeException ? $exception->getMessage() : 'The city could not be located right now. Please try again.'], 503);
        }

        $normalize = static function (?string $name): string {
            $name = mb_strtolower(trim($name ?? ''));
            $name = preg_replace('/^(city of|municipality of)\s+/i', '', $name);

            return trim(preg_replace('/\s+(city|municipality)$/i', '', $name));
        };
        $cityMatches = in_array($normalize($validated['service_city']), array_map($normalize, array_filter([
            $result['city'] ?? null,
            $result['county'] ?? null,
        ])), true);
        if (($result['country_code'] ?? null) !== 'ph' || ! $cityMatches) {
            return response()->json(['message' => 'We could not locate that city. Check the province and city, then try again.'], 422);
        }

        $latitude = (float) ($result['lat'] ?? 0);
        $longitude = (float) ($result['lon'] ?? 0);
        if ($latitude === 0.0 && $longitude === 0.0) {
            return response()->json(['message' => 'We could not locate that city. Check the province and city, then try again.'], 422);
        }

        return response()->json(['latitude' => $latitude, 'longitude' => $longitude]);
    }

    /** @param array<int, array<string, mixed>> $items
     * @return array<int, array{code: string, name: string, province?: string}>
     */
    private function formatOptions(array $items): array
    {
        return collect($items)
            ->map(function (array $item): array {
                $option = [
                    'code' => (string) ($item['code'] ?? $item['psgc_code'] ?? ''),
                    'name' => $this->repairMojibake((string) ($item['name'] ?? $item['area_name'] ?? '')),
                ];
                if (isset($item['province']) && is_string($item['province'])) {
                    $option['province'] = $item['province'];
                }

                return $option;
            })
            ->filter(fn (array $item): bool => $item['code'] !== '' && $item['name'] !== '')
            ->sortBy('name')
            ->values()
            ->all();
    }

    private function repairMojibake(string $value): string
    {
        if (! str_contains($value, 'Ã') && ! str_contains($value, 'Â')) {
            return $value;
        }

        $repaired = mb_convert_encoding($value, 'ISO-8859-1', 'UTF-8');

        return mb_check_encoding($repaired, 'UTF-8') ? $repaired : $value;
    }

    /** @return array<int, array<string, mixed>> */
    private function fetchPsgc(string $path): array
    {
        $response = Http::acceptJson()
            ->timeout(8)
            ->get('https://psgc.cloud/api/v2/'.$path);

        if (! $response->successful()) {
            throw new RuntimeException('The Philippine location list is temporarily unavailable. Please try again.');
        }

        $items = $response->json('data', $response->json());
        if (! is_array($items)) {
            throw new RuntimeException('The Philippine location list returned an invalid response.');
        }

        return array_values(array_filter($items, 'is_array'));
    }

    private function reserveDailyGeoapifyRequest(): bool
    {
        $dailyLimitKey = 'geoapify-address-requests:'.now()->toDateString();
        Cache::add($dailyLimitKey, 0, now()->endOfDay());

        return Cache::increment($dailyLimitKey) <= 2500;
    }
}
