<?php

namespace App\Http\Controllers;

use App\Models\ArtistOffering;
use App\Models\ArtistService;
use App\Models\Booking;
use App\Models\BookingBalancePayment;
use App\Models\InspoImage;
use App\Models\ServiceArea;
use App\Models\User;
use App\Notifications\ArtistBookingUpdate;
use App\Notifications\NewBookingRequest;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class BookingController extends Controller
{
    /** Clients may change a confirmed booking only if it is further away than this. */
    private const CHANGE_CUTOFF_HOURS = 24;

    private const MAX_DAILY_BOOKINGS = 2;

    private const RUSH_BOOKING_DAYS = 7;

    private const RUSH_BOOKING_FEE = 500;

    private const EARLY_CALL_TIME_FEE = 500;

    private const DEFAULT_METRO_MANILA_TRAVEL_FEE = 500;

    private const DEFAULT_OUT_OF_TOWN_TRAVEL_FEE = 1000;

    private const BOOKING_TERMS_VERSION = '2026-10-15-v1';

    private const BOOKING_TERMS = <<<'TERMS'
To secure your booking, a 50% downpayment of the total package price is required before your scheduled appointment. The downpayment confirms and reserves your preferred date and time.

Mode of payment: GCash
09241013301 T***E N** D** C**

Please note:
• The downpayment is non-refundable once the booking is confirmed.
• If the downpayment is not settled before the required time, the schedule may be released and offered to other clients.
• The remaining balance must be paid on the day of the service.

Once the downpayment is received, your appointment will be officially secured.

Thank you and we look forward to glamming you!
HMUA: GlowUpByTrixie
TERMS;

    /** The one artist (and admin) of the studio. */
    private function theArtist(): ?User
    {
        return User::where('role', 'artist')->orderBy('id')->first();
    }

    /**
     * Is the artist already booked around this time?
     * Pending and confirmed bookings both block the slot.
     */
    private function slotTaken(
        int $artistId,
        string $date,
        string $time,
        string $serviceName,
        ?int $ignoreBookingId = null,
    ): bool {
        $start = Carbon::parse("{$date} {$time}");
        $end = $start->copy()->addMinutes($this->sessionDurationMinutes($serviceName));

        return Booking::where('artist_id', $artistId)
            ->whereDate('booking_date', $date)
            ->whereIn('status', ['pending', 'confirmed'])
            ->when($ignoreBookingId, fn ($q) => $q->where('id', '!=', $ignoreBookingId))
            ->get(['booking_time', 'service'])
            ->contains(function ($other) use ($date, $start, $end) {
                $otherStart = Carbon::parse("{$date} {$other->booking_time}");
                $otherEnd = $otherStart->copy()->addMinutes($this->sessionDurationMinutes($other->service));

                return $start->lt($otherEnd) && $end->gt($otherStart);
            });
    }

    private function sessionDurationMinutes(string $serviceName): int
    {
        return preg_match('/bridal|wedding/i', $serviceName) === 1 ? 180 : 90;
    }

    private function allowsMultipleBookingsPerDay(string $serviceName): bool
    {
        return preg_match('/photo|event|debut|prenup|wedding/i', $serviceName) === 1;
    }

    private function dailyCapacityReached(
        int $artistId,
        string $date,
        string $serviceName,
        ?int $ignoreBookingId = null,
    ): bool {
        if ($this->allowsMultipleBookingsPerDay($serviceName)) {
            return false;
        }

        return Booking::where('artist_id', $artistId)
            ->whereDate('booking_date', $date)
            ->whereIn('status', ['pending', 'confirmed', 'completed'])
            ->when($ignoreBookingId, fn ($q) => $q->where('id', '!=', $ignoreBookingId))
            ->count() >= self::MAX_DAILY_BOOKINGS;
    }

    private function dateBlocked(User $artist, string $date): bool
    {
        return in_array($date, $artist->blocked_booking_dates ?? [], true);
    }

    public function create(Request $request)
    {
        $artist = $this->theArtist();

        $inspoImages = InspoImage::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn ($img) => [
                'id' => $img->id,
                'url' => route('inspo.show', $img),
                'caption' => $img->caption,
            ]);

        $services = $artist
            ? ArtistService::where('user_id', $artist->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'price', 'description'])
                ->map(fn (ArtistService $service) => [
                    'id' => $service->id,
                    'name' => $service->name,
                    'price' => (float) $service->price,
                    'description' => $service->description,
                ])
            : collect();

        $offerings = $artist
            ? ArtistOffering::where('user_id', $artist->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn (ArtistOffering $offering) => [
                    'id' => $offering->id,
                    'kind' => $offering->kind,
                    'name' => $offering->name,
                    'price' => $offering->price === null ? null : (float) $offering->price,
                    'pricing_type' => $offering->pricing_type,
                    'description' => $offering->description,
                    'inclusions' => $offering->inclusions ?? [],
                    'add_on_min_quantity' => $offering->add_on_min_quantity,
                    'add_on_max_quantity' => $offering->add_on_max_quantity,
                ])
            : collect();

        return Inertia::render('bookings/create', [
            'artist' => $artist
                ? $artist->only('id', 'name', 'specialty', 'years_experience', 'bio')
                : null,
            'savedAddress' => $request->user()->only(
                'street_address',
                'barangay',
                'city',
                'province',
                'postal_code',
            ),
            'inspoImages' => $inspoImages,
            'services' => $services,
            'packages' => $offerings->where('kind', 'package')->values(),
            'addOns' => $offerings->where('kind', 'add_on')->values(),
            'minimumBookingDate' => Carbon::today()->toDateString(),
            'maximumBookingDate' => $this->maximumBookingDate(),
            'rushBookingCutoffDate' => Carbon::today()->addDays(self::RUSH_BOOKING_DAYS)->toDateString(),
            'rushBookingFee' => self::RUSH_BOOKING_FEE,
            'earlyCallTimeFee' => self::EARLY_CALL_TIME_FEE,
            'metroManilaTravelFee' => (int) ($artist?->metro_manila_travel_fee ?? self::DEFAULT_METRO_MANILA_TRAVEL_FEE),
            'outOfTownTravelFee' => (int) ($artist?->out_of_town_travel_fee ?? self::DEFAULT_OUT_OF_TOWN_TRAVEL_FEE),
            'serviceCities' => $this->serviceCities($artist),
            'serviceAreas' => $artist?->serviceAreas()->get(['name', 'fee_group', 'level', 'starting_fee', 'note']) ?? collect(),
            'bookingTerms' => [
                'version' => self::BOOKING_TERMS_VERSION,
                'text' => self::BOOKING_TERMS,
            ],
        ]);
    }

    public function checkAvailability(Request $request): JsonResponse
    {
        $artist = $this->theArtist();

        if (! $artist) {
            return response()->json([
                'available' => false,
                'message' => 'Bookings are not open yet.',
            ]);
        }

        $validated = $request->validate([
            'booking_date' => ['required', 'date', 'after_or_equal:today', 'before_or_equal:'.$this->maximumBookingDate()],
            'booking_time' => ['nullable', 'date_format:H:i,H:i:s'],
            'service' => [
                'nullable',
                'string',
                Rule::exists('artist_services', 'name')
                    ->where('user_id', $artist->id)
                    ->where('is_active', true),
            ],
            'package_id' => [
                'nullable',
                'integer',
                Rule::exists('artist_offerings', 'id')
                    ->where('user_id', $artist->id)
                    ->where('kind', 'package')
                    ->where('is_active', true),
            ],
        ]);

        $service = filled($validated['service'] ?? null)
            ? ArtistService::where('user_id', $artist->id)->where('name', $validated['service'])->first()
            : null;
        $package = filled($validated['package_id'] ?? null)
            ? ArtistOffering::where('user_id', $artist->id)->find($validated['package_id'])
            : null;

        if (($service === null) === ($package === null)) {
            return response()->json([
                'available' => false,
                'message' => 'Choose a service or package to check availability.',
            ]);
        }

        $serviceName = $package?->name ?? $service->name;

        if ($this->dateBlocked($artist, $validated['booking_date'])) {
            return response()->json([
                'available' => false,
                'message' => 'The artist is unavailable on this date. Please choose another day.',
            ]);
        }

        if ($this->dailyCapacityReached($artist->id, $validated['booking_date'], $serviceName)) {
            return response()->json([
                'available' => false,
                'message' => 'This date has reached the usual limit of two bookings. Please choose another date.',
            ]);
        }

        if (filled($validated['booking_time'] ?? null)) {
            if (Carbon::parse("{$validated['booking_date']} {$validated['booking_time']}")->isPast()) {
                return response()->json([
                    'available' => false,
                    'message' => 'Please choose a future time.',
                ]);
            }

            if ($this->slotTaken($artist->id, $validated['booking_date'], $validated['booking_time'], $serviceName)) {
                return response()->json([
                    'available' => false,
                    'message' => 'That time conflicts with another booking. Please choose a different time.',
                ]);
            }
        }

        return response()->json([
            'available' => true,
            'message' => filled($validated['booking_time'] ?? null)
                ? 'This date and time appear available. The artist will confirm your request.'
                : 'This date has booking capacity. Choose a time to check the slot.',
        ]);
    }

    public function store(Request $request)
    {
        $artist = $this->theArtist();

        abort_unless($artist, 422, 'Bookings are not open yet.');

        $validated = $request->validate([
            'terms_accepted' => ['required', 'accepted'],
            'terms_version' => ['required', 'string', Rule::in([self::BOOKING_TERMS_VERSION])],
            'service' => [
                'nullable',
                'string',
                Rule::exists('artist_services', 'name')
                    ->where('user_id', $artist->id)
                    ->where('is_active', true),
            ],
            'package_id' => [
                'nullable',
                'integer',
                Rule::exists('artist_offerings', 'id')
                    ->where('user_id', $artist->id)
                    ->where('kind', 'package')
                    ->where('is_active', true),
            ],
            'add_on_quantities' => ['nullable', 'array', 'max:10'],
            'add_on_quantities.*' => ['required', 'integer', 'min:1', 'max:50'],
            'booking_date' => [
                'required',
                'date',
                'after_or_equal:today',
                'before_or_equal:'.$this->maximumBookingDate(),
            ],
            'booking_time' => ['required', 'date_format:H:i,H:i:s'],
            'service_city' => ['required', 'string', 'max:100'],
            'service_province' => ['required', 'string', 'max:100'],
            'venue_barangay' => ['required', 'string', 'max:150'],
            'venue_street' => ['required', 'string', 'min:3', 'max:500'],
            'venue_landmark' => ['nullable', 'string', 'max:255'],
            'venue_latitude' => ['required', 'numeric', 'between:-90,90'],
            'venue_longitude' => ['required', 'numeric', 'between:-180,180'],
            'address_confirmed' => ['required', 'accepted'],
            'notes' => ['nullable', 'string', 'max:500'],
            'inspo_image_id' => [
                'nullable',
                Rule::exists('inspo_images', 'id')->where('user_id', $request->user()->id),
            ],
            'new_inspo_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:5120'],
        ]);

        $serviceArea = ServiceArea::resolveForAddress($artist, $validated['service_city'], $validated['service_province']);

        if ($serviceArea?->level === 'not_served') {
            throw ValidationException::withMessages([
                'service_city' => 'This location is no longer accepting booking requests. Choose another area or contact Trixie.',
            ]);
        }

        $addressVerification = $request->session()->get('booking_address_verification');
        $expectedAddressHash = BookingAddressVerificationController::addressHash(
            $request->user()->id,
            $validated['service_province'],
            $validated['service_city'],
            $validated['venue_barangay'],
            $validated['venue_street'],
            $validated['venue_landmark'] ?? '',
            (float) $validated['venue_latitude'],
            (float) $validated['venue_longitude'],
        );
        if (! is_array($addressVerification)
            || ! hash_equals((string) ($addressVerification['hash'] ?? ''), $expectedAddressHash)
            || ($addressVerification['verified_at'] ?? 0) < now()->subMinutes(15)->timestamp) {
            throw ValidationException::withMessages([
                'address_confirmed' => 'Confirm the pin on the map again before sending your booking request.',
            ]);
        }

        $hasService = filled($validated['service'] ?? null);
        $hasPackage = filled($validated['package_id'] ?? null);

        if ($hasService === $hasPackage) {
            throw ValidationException::withMessages([
                'service' => 'Choose one service or one package.',
                'package_id' => 'Choose one service or one package.',
            ]);
        }

        $package = $hasPackage
            ? ArtistOffering::where('user_id', $artist->id)->findOrFail($validated['package_id'])
            : null;
        $service = $hasService
            ? ArtistService::where('user_id', $artist->id)->where('name', $validated['service'])->firstOrFail()
            : null;
        $basePrice = $package?->price !== null
            ? (float) $package->price
            : ($service ? (float) $service->price : null);
        $basePriceType = $package?->pricing_type ?? 'fixed';

        $requestedQuantities = $validated['add_on_quantities'] ?? [];
        $selectedAddOnModels = ArtistOffering::where('user_id', $artist->id)
            ->where('kind', 'add_on')
            ->where('is_active', true)
            ->whereIn('id', array_keys($requestedQuantities))
            ->get()
            ->keyBy('id');

        if ($selectedAddOnModels->count() !== count($requestedQuantities)) {
            throw ValidationException::withMessages([
                'add_on_quantities' => 'One or more selected add-ons are no longer available.',
            ]);
        }

        foreach ($requestedQuantities as $addOnId => $quantity) {
            $addOn = $selectedAddOnModels->get((int) $addOnId);
            $quantity = (int) $quantity;
            $quantityLimitsApply = $addOn && $this->usesQuantityLimits($addOn->name);
            $minimumQuantity = $quantityLimitsApply ? $addOn->add_on_min_quantity : 1;
            $maximumQuantity = $quantityLimitsApply ? $addOn->add_on_max_quantity : 1;

            if (! $addOn || $quantity < $minimumQuantity || $quantity > $maximumQuantity) {
                throw ValidationException::withMessages([
                    "add_on_quantities.{$addOnId}" => $addOn
                        ? ($quantityLimitsApply
                            ? "Choose a quantity from {$minimumQuantity} to {$maximumQuantity}."
                            : 'This add-on can only be selected once.')
                        : 'This add-on is no longer available.',
                ]);
            }
        }

        $selectedAddOns = $selectedAddOnModels
            ->map(function (ArtistOffering $addOn) use ($requestedQuantities) {
                $quantity = (int) $requestedQuantities[$addOn->id];
                $unitPrice = $addOn->price === null ? null : (float) $addOn->price;

                return [
                    'id' => $addOn->id,
                    'name' => $addOn->name,
                    'price' => $unitPrice,
                    'quantity' => $quantity,
                    'line_total' => $unitPrice === null ? null : $unitPrice * $quantity,
                    'pricing_type' => $addOn->pricing_type,
                ];
            })
            ->values()
            ->all();

        $estimatedTotal = ($basePrice ?? 0)
            + collect($selectedAddOns)->sum(fn (array $addOn) => $addOn['line_total'] ?? 0);

        if (Carbon::parse("{$validated['booking_date']} {$validated['booking_time']}")->isPast()) {
            throw ValidationException::withMessages([
                'booking_time' => 'Please pick a time in the future.',
            ]);
        }

        $serviceName = $package?->name ?? $service->name;

        $inspoId = $validated['inspo_image_id'] ?? null;

        if ($request->hasFile('new_inspo_image')) {
            $path = $request->file('new_inspo_image')->store('inspo');

            $inspo = InspoImage::create([
                'user_id' => $request->user()->id,
                'path' => $path,
            ]);

            $inspoId = $inspo->id;
        }

        $booking = DB::transaction(function () use (
            $artist,
            $request,
            $validated,
            $serviceName,
            $package,
            $basePrice,
            $basePriceType,
            $estimatedTotal,
            $selectedAddOns,
            $inspoId,
        ): Booking {
            User::query()->whereKey($artist->id)->lockForUpdate()->firstOrFail();

            $artist->refresh();
            $serviceArea = ServiceArea::resolveForAddress($artist, $validated['service_city'], $validated['service_province'], true);

            if ($serviceArea?->level === 'not_served') {
                throw ValidationException::withMessages([
                    'service_city' => 'This location is no longer accepting booking requests. Choose another area or contact Trixie.',
                ]);
            }

            $feeGroup = $serviceArea?->fee_group ?? ($this->isMetroManilaProvince($validated['service_province']) ? 'metro_manila' : 'nearby_province');
            $areaLevel = $serviceArea?->level ?? 'on_request';
            $defaultTravelFee = $feeGroup === 'nearby_province'
                ? (int) ($artist->out_of_town_travel_fee ?? self::DEFAULT_OUT_OF_TOWN_TRAVEL_FEE)
                : (int) ($artist->metro_manila_travel_fee ?? self::DEFAULT_METRO_MANILA_TRAVEL_FEE);
            $travelFee = (int) ($serviceArea?->starting_fee ?? $defaultTravelFee);
            $bookingFees = $this->withBookingFees(
                $selectedAddOns,
                $estimatedTotal,
                $validated['booking_date'],
                $validated['booking_time'],
                $feeGroup,
                $travelFee,
                $travelFee,
                $areaLevel === 'on_request',
            );
            $bookingAddOns = $bookingFees['selected_add_ons'];
            $bookingTotal = $bookingFees['estimated_total'] ?? $estimatedTotal;
            // Every booking needs the artist's final makeup and travel quote
            // before the client can accept the quote and submit a deposit.
            $requiresQuote = true;

            if ($this->dateBlocked($artist, $validated['booking_date'])) {
                throw ValidationException::withMessages([
                    'booking_date' => 'The artist is unavailable on this date. Please choose another day.',
                ]);
            }

            if ($this->dailyCapacityReached($artist->id, $validated['booking_date'], $serviceName)) {
                throw ValidationException::withMessages([
                    'booking_date' => 'The artist has reached the usual limit of two bookings for this day. Please choose another date.',
                ]);
            }

            if ($this->slotTaken($artist->id, $validated['booking_date'], $validated['booking_time'], $serviceName)) {
                throw ValidationException::withMessages([
                    'booking_time' => 'That time is already taken. Please choose a different time.',
                ]);
            }

            return Booking::create([
                'client_id' => $request->user()->id,
                'artist_id' => $artist->id,
                'service' => $serviceName,
                'package_id' => $package?->id,
                'base_price' => $basePrice,
                'base_price_type' => $basePriceType,
                'estimated_total' => $bookingTotal,
                'selected_add_ons' => $bookingAddOns,
                'requires_quote' => $requiresQuote,
                'quote_accepted_at' => $requiresQuote ? null : now(),
                'deposit_status' => $requiresQuote ? 'not_due' : 'due',
                'booking_date' => $validated['booking_date'],
                'booking_time' => $validated['booking_time'],
                'location_type' => $feeGroup,
                'service_area_level' => $areaLevel,
                'service_province' => $validated['service_province'],
                'venue_address' => $this->formatVenueAddress($validated),
                'venue_barangay' => $validated['venue_barangay'],
                'venue_street' => $validated['venue_street'],
                'venue_landmark' => $validated['venue_landmark'] ?? null,
                'venue_latitude' => $validated['venue_latitude'],
                'venue_longitude' => $validated['venue_longitude'],
                'notes' => $validated['notes'] ?? null,
                'inspo_image_id' => $inspoId,
                'status' => 'pending',
                'terms_version' => self::BOOKING_TERMS_VERSION,
                'terms_text' => self::BOOKING_TERMS,
                'terms_accepted_at' => now(),
            ]);
        });

        $artist->notify(new NewBookingRequest($booking));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved!']);

        $request->session()->forget('booking_address_verification');

        return redirect('/dashboard');
    }

    public function accept(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);

        abort_unless(
            $booking->status === 'pending',
            422,
            'This booking is no longer pending.'
        );

        abort_unless(
            ! $booking->transportation_fee_pending && ! $booking->quote_pending,
            422,
            'The client must accept the final quote first.'
        );

        abort_unless(
            $booking->quote_accepted_at !== null && $booking->deposit_status === 'received',
            422,
            'The final quote must be accepted and the 50% deposit received before confirming this booking.'
        );

        $validated = $request->validate([
            'artist_message' => ['nullable', 'string', 'max:300'],
        ]);

        $booking->update([
            'status' => 'confirmed',
            'artist_message' => $validated['artist_message'] ?? null,
        ]);

        $booking->loadMissing('artist');
        $booking->artist?->notifications()
            ->where('type', NewBookingRequest::class)
            ->where('data->booking_id', $booking->id)
            ->delete();

        $booking->loadMissing('artist');
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'confirmed'));

        return back();
    }

    public function updateTransportationFee(Request $request, Booking $booking)
    {
        $request->merge([
            'final_makeup_price' => $booking->final_makeup_price ?? $booking->base_price ?? 0,
            'quote_reason' => $booking->quote_reason,
        ]);

        return $this->saveQuote($request, $booking);
    }

    public function sendQuote(Request $request, Booking $booking)
    {
        return $this->saveQuote($request, $booking);
    }

    private function saveQuote(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);
        abort_unless($booking->status === 'pending', 422, 'Only pending booking requests can be quoted.');
        abort_unless(! in_array($booking->deposit_status, ['submitted', 'received'], true), 422, 'A quote cannot be changed after the deposit has been submitted.');

        $validated = $request->validate([
            'final_makeup_price' => ['required', 'numeric', 'min:0', 'max:1000000'],
            'transportation_fee' => ['required', 'integer', 'min:0', 'max:1000000'],
            'quote_reason' => ['nullable', 'string', 'max:500'],
        ]);

        $startingPrice = (float) ($booking->base_price ?? 0);
        $finalMakeupPrice = (float) $validated['final_makeup_price'];

        if ($finalMakeupPrice > $startingPrice && blank($validated['quote_reason'] ?? null)) {
            throw ValidationException::withMessages([
                'quote_reason' => 'Explain why the final makeup price is above the starting price.',
            ]);
        }

        $originalAddOns = $booking->selected_add_ons ?? [];
        $addOns = $originalAddOns;
        $transportIndex = null;
        foreach ($addOns as $index => $addOn) {
            if (($addOn['is_system_fee'] ?? false) && preg_match('/transportation/i', $addOn['name'] ?? '') === 1) {
                $transportIndex = $index;
                break;
            }
        }

        $newFee = (int) $validated['transportation_fee'];
        $oldFee = 0;
        if ($transportIndex !== null) {
            $oldFee = (float) ($addOns[$transportIndex]['line_total'] ?? $addOns[$transportIndex]['price'] ?? 0);
            $addOns[$transportIndex]['price'] = $newFee;
            $addOns[$transportIndex]['line_total'] = $newFee;
        } else {
            $addOns[] = $this->systemFeeSnapshot(
                $booking->location_type === 'nearby_province'
                    ? 'Nearby-province transportation (starting fee)'
                    : 'Metro Manila transportation (starting fee)',
                $newFee,
            );
            $transportIndex = array_key_last($addOns);
        }

        $oldMakeupPrice = (float) ($booking->final_makeup_price ?? $booking->base_price ?? 0);
        $existingTotal = $booking->estimated_total === null
            ? $oldMakeupPrice + collect($originalAddOns)->sum(fn (array $item) => (float) ($item['line_total'] ?? 0))
            : (float) $booking->estimated_total;
        $estimatedTotal = max(0, $existingTotal - $oldMakeupPrice - $oldFee + $finalMakeupPrice + $newFee);

        $booking->update([
            'selected_add_ons' => $addOns,
            'estimated_total' => $estimatedTotal,
            'final_makeup_price' => $finalMakeupPrice,
            'quote_reason' => $validated['quote_reason'] ?? null,
            'quote_pending' => true,
            'quote_accepted_at' => null,
            'deposit_status' => 'not_due',
            'deposit_method' => null,
            'deposit_reference' => null,
            'deposit_proof_path' => null,
            'deposit_received_at' => null,
            'deposit_amount' => null,
            'transportation_fee_pending' => true,
        ]);

        $booking->loadMissing('client', 'artist');
        $booking->client?->notifications()
            ->where('data->booking_id', $booking->id)
            ->whereIn('data->event', ['travel_fee_updated', 'quote_updated'])
            ->delete();
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'quote_updated'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved!']);

        return back();
    }

    public function acceptTransportationFee(Request $request, Booking $booking)
    {
        return $this->acceptQuote($request, $booking);
    }

    public function acceptQuote(Request $request, Booking $booking)
    {
        abort_unless($booking->client_id === $request->user()->id, 403);
        abort_unless($booking->status === 'pending', 422, 'This booking is no longer pending.');
        abort_unless($booking->quote_pending || $booking->transportation_fee_pending, 422, 'There is no updated quote to accept.');

        $booking->update([
            'quote_pending' => false,
            'quote_accepted_at' => now(),
            'transportation_fee_pending' => false,
            'deposit_status' => 'due',
        ]);

        $booking->loadMissing('client', 'artist');
        $booking->client?->notifications()
            ->where('data->booking_id', $booking->id)
            ->whereIn('data->event', ['travel_fee_updated', 'quote_updated'])
            ->delete();
        $booking->artist?->notify(new ArtistBookingUpdate($booking, 'quote_accepted'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved!']);

        return back();
    }

    public function submitDeposit(Request $request, Booking $booking)
    {
        abort_unless($booking->client_id === $request->user()->id, 403);
        abort_unless($booking->status === 'pending', 422, 'This booking is no longer awaiting a deposit.');
        abort_unless($booking->deposit_status === 'due', 422, 'There is no deposit awaiting submission.');

        $validated = $request->validate([
            'deposit_method' => ['required', Rule::in(['gcash', 'bank_transfer', 'cash'])],
            'deposit_reference' => ['nullable', 'string', 'max:120'],
            'deposit_proof' => ['required_if:deposit_method,gcash,bank_transfer', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $proofPath = isset($validated['deposit_proof'])
            ? $validated['deposit_proof']->store('deposit-proofs')
            : null;

        $booking->update([
            'deposit_status' => 'submitted',
            'deposit_method' => $validated['deposit_method'],
            'deposit_reference' => $validated['deposit_reference'] ?? null,
            'deposit_proof_path' => $proofPath,
        ]);

        $booking->loadMissing('client', 'artist');
        $booking->artist?->notify(new ArtistBookingUpdate($booking, 'deposit_submitted'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved!']);

        return back();
    }

    public function showDepositProof(Request $request, Booking $booking)
    {
        abort_unless(in_array($request->user()->id, [$booking->client_id, $booking->artist_id], true), 403);
        abort_unless($booking->deposit_proof_path && Storage::disk('local')->exists($booking->deposit_proof_path), 404);

        return Storage::disk('local')->response(
            $booking->deposit_proof_path,
            null,
            ['Cache-Control' => 'private, no-store'],
        );
    }

    public function markDepositReceived(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);
        abort_unless($booking->status === 'pending', 422, 'This booking is no longer awaiting deposit verification.');
        abort_unless($booking->deposit_status === 'submitted', 422, 'The client has not marked the deposit as sent.');
        abort_unless($booking->quote_accepted_at !== null && $booking->estimated_total !== null, 422, 'The accepted booking total is unavailable.');

        $depositAmount = round((float) $booking->estimated_total / 2, 2);

        $booking->update([
            'deposit_status' => 'received',
            'deposit_received_at' => now(),
            'deposit_amount' => $depositAmount,
        ]);

        $booking->loadMissing('client', 'artist');
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'deposit_received'));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saved!']);

        return back();
    }

    public function recordBalancePayment(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'method' => ['required', Rule::in(['gcash', 'bank_transfer', 'cash', 'other'])],
            'reference' => ['nullable', 'string', 'max:120'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
        ]);

        [$payment, $remainingBalance] = DB::transaction(function () use ($booking, $request, $validated): array {
            $lockedBooking = Booking::query()->lockForUpdate()->findOrFail($booking->id);

            abort_unless(
                in_array($lockedBooking->status, ['confirmed', 'completed'], true)
                    && $lockedBooking->deposit_status === 'received'
                    && $lockedBooking->quote_accepted_at !== null
                    && $lockedBooking->estimated_total !== null,
                422,
                'A confirmed deposit and accepted booking total are required before recording balance payments.',
            );

            $totalCents = (int) round((float) $lockedBooking->estimated_total * 100);
            $depositCents = (int) round((float) ($lockedBooking->deposit_amount ?? 0) * 100);
            $balancePaymentsCents = (int) round((float) BookingBalancePayment::where('booking_id', $lockedBooking->id)->sum('amount') * 100);
            $remainingCents = max(0, $totalCents - $depositCents - $balancePaymentsCents);
            $paymentCents = (int) round((float) $validated['amount'] * 100);

            if ($paymentCents > $remainingCents) {
                throw ValidationException::withMessages([
                    'amount' => 'The payment cannot be greater than the remaining balance of ₱'.number_format($remainingCents / 100, 2).'.',
                ]);
            }

            $payment = $lockedBooking->balancePayments()->create([
                'recorded_by' => $request->user()->id,
                'amount' => number_format($paymentCents / 100, 2, '.', ''),
                'method' => $validated['method'],
                'reference' => $validated['reference'] ?? null,
                'paid_at' => $validated['paid_at'],
            ]);

            return [$payment, $remainingCents - $paymentCents];
        });

        $booking->loadMissing('client', 'artist');
        $booking->client?->notify(new ArtistBookingUpdate(
            $booking,
            'balance_payment_recorded',
            $payment,
            $remainingBalance,
        ));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Balance payment recorded.']);

        return back();
    }

    public function decline(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);

        abort_unless(
            $booking->status === 'pending',
            422,
            'This booking is no longer pending.'
        );

        $validated = $request->validate([
            'artist_message' => ['nullable', 'string', 'max:300'],
        ]);

        $booking->update([
            'status' => 'cancelled',
            'cancelled_by' => 'artist',
            'artist_message' => $validated['artist_message'] ?? null,
        ]);

        $this->clearBookingNotifications($booking);
        $booking->loadMissing('artist');
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'declined'));

        return back();
    }

    public function cancel(Request $request, Booking $booking)
    {
        $userId = $request->user()->id;

        abort_unless(
            $booking->client_id === $userId || $booking->artist_id === $userId,
            403
        );

        abort_unless(
            in_array($booking->status, ['pending', 'confirmed'], true),
            422,
            'This booking can no longer be cancelled.'
        );

        $booking->update([
            'status' => 'cancelled',
            'cancelled_by' => $booking->client_id === $userId ? 'client' : 'artist',
        ]);

        $this->clearBookingNotifications($booking);

        if ($booking->cancelled_by === 'artist') {
            $booking->loadMissing('artist');
            $booking->client?->notify(new ArtistBookingUpdate($booking, 'cancelled'));
        } else {
            $booking->loadMissing('client');
            $booking->artist?->notify(new ArtistBookingUpdate($booking, 'client_cancelled'));
        }

        return back();
    }

    /**
     * Client asks for a new date/time. The booking goes back to "pending"
     * so the artist has to approve the new slot.
     */
    public function reschedule(Request $request, Booking $booking)
    {
        abort_unless($booking->client_id === $request->user()->id, 403);

        $currentStart = Carbon::parse("{$booking->booking_date} {$booking->booking_time}");

        $allowed = $booking->status === 'pending'
            || ($booking->status === 'confirmed'
                && $currentStart->gt(now()->addHours(self::CHANGE_CUTOFF_HOURS)));

        abort_unless($allowed, 422, 'This booking can no longer be rescheduled.');

        $validated = $request->validate([
            'booking_date' => ['required', 'date', 'after_or_equal:today', 'before_or_equal:'.$this->maximumBookingDate()],
            'booking_time' => ['required', 'date_format:H:i,H:i:s'],
        ]);

        $newStart = Carbon::parse("{$validated['booking_date']} {$validated['booking_time']}");

        abort_if($newStart->isPast(), 422, 'Please pick a time in the future.');

        DB::transaction(function () use ($booking, $validated): void {
            $artist = User::query()->whereKey($booking->artist_id)->lockForUpdate()->firstOrFail();

            if ($this->dateBlocked($artist, $validated['booking_date'])) {
                throw ValidationException::withMessages([
                    'booking_date' => 'The artist is unavailable on this date. Please choose another day.',
                ]);
            }

            if ($this->dailyCapacityReached($booking->artist_id, $validated['booking_date'], $booking->service, $booking->id)) {
                throw ValidationException::withMessages([
                    'booking_date' => 'The artist has reached the usual limit of two bookings for this day. Please choose another date.',
                ]);
            }

            if ($this->slotTaken($booking->artist_id, $validated['booking_date'], $validated['booking_time'], $booking->service, $booking->id)) {
                throw ValidationException::withMessages([
                    'booking_time' => 'That time is already taken. Please choose a different time.',
                ]);
            }

            $booking->update([
                'booking_date' => $validated['booking_date'],
                'booking_time' => $validated['booking_time'],
                'status' => 'pending',
                ...$this->withBookingFees(
                    $booking->selected_add_ons ?? [],
                    $booking->estimated_total === null ? null : (float) $booking->estimated_total,
                    $validated['booking_date'],
                    $validated['booking_time'],
                    in_array($booking->location_type, ['metro_manila', 'nearby_province'], true)
                        ? $booking->location_type
                        : 'metro_manila',
                    (int) ($booking->artist?->metro_manila_travel_fee ?? self::DEFAULT_METRO_MANILA_TRAVEL_FEE),
                    (int) ($booking->artist?->out_of_town_travel_fee ?? self::DEFAULT_OUT_OF_TOWN_TRAVEL_FEE),
                    $booking->service_area_level === 'on_request',
                ),
                // the old message belonged to the old slot
                'artist_message' => null,
            ]);
        });

        return back();
    }

    /** Artist marks a confirmed session as done. */
    public function complete(Request $request, Booking $booking)
    {
        abort_unless($booking->artist_id === $request->user()->id, 403);

        abort_unless(
            $booking->status === 'confirmed',
            422,
            'Only confirmed bookings can be marked as completed.'
        );

        $booking->update(['status' => 'completed']);

        $booking->loadMissing('artist');
        $booking->client?->notify(new ArtistBookingUpdate($booking, 'completed'));

        return back();
    }

    private function usesQuantityLimits(string $name): bool
    {
        return preg_match('/bridesmaid|flower\s+girl/i', $name) === 1;
    }

    private function clearBookingNotifications(Booking $booking): void
    {
        $booking->loadMissing('artist', 'client');

        foreach ([$booking->artist, $booking->client] as $recipient) {
            $recipient?->notifications()
                ->where('data->booking_id', $booking->id)
                ->delete();
        }
    }

    private function serviceCities(?User $artist = null): array
    {
        $areas = $artist?->serviceAreas()
            ->whereIn('level', ['covered', 'on_request'])
            ->orderBy('name')
            ->get(['name', 'fee_group', 'level', 'starting_fee', 'note']) ?? collect();

        return [
            'metroManila' => $areas->where('fee_group', 'metro_manila')->values(),
            'nearbyProvince' => $areas->where('fee_group', 'nearby_province')->values(),
        ];
    }

    private function maximumBookingDate(): string
    {
        return Carbon::today()->addMonths((int) config('booking.max_advance_months', 24))->toDateString();
    }

    private function isMetroManilaProvince(string $province): bool
    {
        return in_array(mb_strtolower(trim($province)), ['metro manila', 'national capital region', 'ncr'], true);
    }

    /** @param array<string, mixed> $address */
    private function formatVenueAddress(array $address): string
    {
        $parts = array_filter([
            $address['venue_street'] ?? null,
            $address['venue_barangay'] ?? null,
            $address['service_city'] ?? null,
            $address['service_province'] ?? null,
            filled($address['venue_landmark'] ?? null) ? 'Landmark: '.$address['venue_landmark'] : null,
        ]);

        return mb_substr(implode(', ', $parts), 0, 1000);
    }

    private function withBookingFees(
        array $selectedAddOns,
        ?float $estimatedTotal,
        string $bookingDate,
        string $bookingTime,
        string $travelArea,
        int $metroManilaTravelFee,
        int $outOfTownTravelFee,
        bool $onRequestArea = false,
    ): array {
        $existingSystemFees = 0.0;
        $regularAddOns = [];

        foreach ($selectedAddOns as $addOn) {
            if ($addOn['is_system_fee'] ?? false) {
                $existingSystemFees += (float) ($addOn['line_total'] ?? 0);

                continue;
            }

            $regularAddOns[] = $addOn;
        }

        $rushFee = Carbon::parse($bookingDate)->startOfDay()->lt(
            Carbon::today()->addDays(self::RUSH_BOOKING_DAYS),
        ) ? self::RUSH_BOOKING_FEE : 0;
        $callTime = Carbon::parse($bookingTime)->format('H:i');
        $earlyCallTimeFee = $callTime >= '01:00' && $callTime <= '05:00'
            ? self::EARLY_CALL_TIME_FEE
            : 0;
        $travelFee = $travelArea === 'nearby_province'
            ? $outOfTownTravelFee
            : $metroManilaTravelFee;

        if ($rushFee > 0) {
            $regularAddOns[] = $this->systemFeeSnapshot('Rush booking fee', self::RUSH_BOOKING_FEE);
        }

        if ($earlyCallTimeFee > 0) {
            $regularAddOns[] = $this->systemFeeSnapshot('Early call time fee', self::EARLY_CALL_TIME_FEE);
        }

        $regularAddOns[] = $this->systemFeeSnapshot(
            $onRequestArea
                ? 'On-request area transportation (starting fee)'
                : ($travelArea === 'nearby_province'
                    ? 'Nearby-province transportation (starting fee)'
                    : 'Metro Manila transportation (starting fee)'),
            $travelFee,
        );

        return [
            'selected_add_ons' => $regularAddOns,
            'estimated_total' => $estimatedTotal === null
                ? null
                : $estimatedTotal - $existingSystemFees + $rushFee + $earlyCallTimeFee + $travelFee,
        ];
    }

    private function systemFeeSnapshot(string $name, int $amount): array
    {
        return [
            'id' => null,
            'name' => $name,
            'price' => $amount,
            'quantity' => 1,
            'line_total' => $amount,
            'pricing_type' => 'fixed',
            'is_system_fee' => true,
        ];
    }
}
