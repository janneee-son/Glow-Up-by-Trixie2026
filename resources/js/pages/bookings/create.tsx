import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Brush,
    CalendarDays,
    Clock,
    ImagePlus,
    MapPin,
    Sparkles,
    X,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import InputError from '@/components/input-error';
import RequiredAsterisk from '@/components/required-asterisk';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const BookingLocationMap = lazy(
    () => import('@/components/booking-location-map'),
);

type Artist = {
    id: number;
    name: string;
    specialty: string | null;
    years_experience: number | null;
    bio: string | null;
};

type InspoImage = {
    id: number;
    url: string;
    caption: string | null;
};

type Service = {
    id: number;
    name: string;
    price: number | string;
    description: string | null;
};

type Offering = {
    id: number;
    name: string;
    price: number | string | null;
    pricing_type: 'fixed' | 'starting_at' | 'quote_required';
    description: string | null;
    inclusions: string[];
    add_on_min_quantity: number;
    add_on_max_quantity: number;
};

type ServiceAreaOption = {
    name: string;
    level: 'covered' | 'on_request' | 'not_served';
    starting_fee: number | null;
    note: string | null;
};

type LocationOption = {
    code: string;
    name: string;
};

type Props = {
    artist: Artist | null;
    savedAddress?: {
        street_address?: string | null;
        barangay?: string | null;
        city?: string | null;
        province?: string | null;
        postal_code?: string | null;
    } | null;
    inspoImages?: InspoImage[] | null;
    services?: Service[] | null;
    packages?: Offering[] | null;
    addOns?: Offering[] | null;
    minimumBookingDate?: string | null;
    maximumBookingDate?: string | null;
    rushBookingCutoffDate?: string | null;
    rushBookingFee?: number;
    earlyCallTimeFee?: number;
    metroManilaTravelFee?: number;
    outOfTownTravelFee?: number;
    serviceAreas?: ServiceAreaOption[];
    bookingTerms: { version: string; text: string };
};

const fieldClass =
    'w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#6b625a] focus-visible:border-[#8a6a2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30';

function isBridalPartyAddOn(name: string): boolean {
    return /mother\s+of\s+the\s+bride|bridesmaid|flower\s+girl/i.test(name);
}

function usesQuantityLimits(name: string): boolean {
    return /bridesmaid|flower\s+girl/i.test(name);
}

function localDateString(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

    return date.toISOString().slice(0, 10);
}

function normalizeLocationName(name: string): string {
    return name
        .toLowerCase()
        .replace(/^(city of|municipality of)\s+/, '')
        .replace(/\s+(city|municipality)$/, '')
        .trim();
}

export default function CreateBooking({
    artist,
    savedAddress,
    inspoImages: inspoImagesProp,
    services: servicesProp,
    packages: packagesProp,
    addOns: addOnsProp,
    minimumBookingDate,
    maximumBookingDate,
    rushBookingCutoffDate,
    rushBookingFee = 500,
    earlyCallTimeFee = 500,
    metroManilaTravelFee = 500,
    outOfTownTravelFee = 1000,
    serviceAreas: serviceAreasProp,
    bookingTerms,
}: Props) {
    const inspoImages = Array.isArray(inspoImagesProp) ? inspoImagesProp : [];

    const services = Array.isArray(servicesProp) ? servicesProp : [];
    const packages = Array.isArray(packagesProp) ? packagesProp : [];
    const addOns = Array.isArray(addOnsProp) ? addOnsProp : [];
    const savedCity = savedAddress?.city?.trim() ?? '';
    const savedProvince = savedAddress?.province?.trim() ?? '';
    const serviceAreas = Array.isArray(serviceAreasProp)
        ? serviceAreasProp
        : [];
    const [
        termsIntroduction = '',
        termsPayment = '',
        termsNotes = '',
        ...termsClosing
    ] = bookingTerms.text.split(/\r?\n\s*\r?\n/);
    const paymentLines = termsPayment.split(/\r?\n/).filter(Boolean);
    const noteLines = termsNotes.split(/\r?\n/).filter(Boolean);
    const closingText = termsClosing.join('\n\n');

    const { auth } = usePage<{
        auth?: {
            user?: {
                name?: string;
                role?: 'client' | 'artist' | 'admin';
            };
        };
    }>().props;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newPreview, setNewPreview] = useState<string | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [availability, setAvailability] = useState<{
        state: 'idle' | 'checking' | 'available' | 'unavailable' | 'error';
        message: string;
    }>({ state: 'idle', message: '' });
    const [addressCheck, setAddressCheck] = useState<{
        state:
            'idle' | 'locating' | 'located' | 'checking' | 'verified' | 'error';
        message: string;
        formattedAddress?: string;
        mapUrl?: string;
    }>({ state: 'idle', message: '' });
    const [provinceOptions, setProvinceOptions] = useState<LocationOption[]>(
        [],
    );
    const [cityOptions, setCityOptions] = useState<LocationOption[]>([]);
    const [barangayOptions, setBarangayOptions] = useState<LocationOption[]>(
        [],
    );
    const [locationsUnavailable, setLocationsUnavailable] = useState(false);
    const [locationMessage, setLocationMessage] = useState('');
    const [mapOpen, setMapOpen] = useState(false);
    const { data, setData, post, processing, errors } = useForm<{
        service: string;
        package_id: number | null;
        add_on_quantities: Record<number, number>;
        booking_date: string;
        booking_time: string;
        service_province: string;
        service_city: string;
        venue_barangay: string;
        venue_street: string;
        venue_landmark: string;
        venue_latitude: number | null;
        venue_longitude: number | null;
        address_confirmed: boolean;
        notes: string;
        inspo_image_id: number | null;
        new_inspo_image: File | null;
        terms_accepted: boolean;
        terms_version: string;
    }>({
        service: '',
        package_id: null,
        add_on_quantities: {},
        booking_date: '',
        booking_time: '',
        service_province: savedProvince,
        service_city: savedCity,
        venue_barangay: savedAddress?.barangay ?? '',
        venue_street: savedAddress?.street_address ?? '',
        venue_landmark: '',
        venue_latitude: null,
        venue_longitude: null,
        address_confirmed: false,
        notes: '',
        inspo_image_id: null,
        new_inspo_image: null,
        terms_accepted: false,
        terms_version: bookingTerms.version,
    });

    const selectedService = services.find(
        (service) => service.name === data.service,
    );
    const selectedPackage = packages.find((pkg) => pkg.id === data.package_id);
    const isBridalBooking = /bridal|wedding/i.test(
        `${selectedService?.name ?? ''} ${selectedPackage?.name ?? ''}`,
    );
    const visibleAddOns = addOns.filter(
        (addOn) => !isBridalPartyAddOn(addOn.name) || isBridalBooking,
    );
    const selectedAddOns = visibleAddOns.filter(
        (addOn) => data.add_on_quantities[addOn.id] != null,
    );
    const baseOffering = selectedPackage ?? selectedService;
    const basePriceType = selectedPackage?.pricing_type ?? 'fixed';
    const basePrice =
        baseOffering?.price == null ? null : Number(baseOffering.price);
    const selectedServiceArea =
        serviceAreas.find(
            (area) =>
                normalizeLocationName(area.name) ===
                normalizeLocationName(data.service_city),
        ) ??
        serviceAreas.find(
            (area) =>
                normalizeLocationName(area.name) ===
                normalizeLocationName(data.service_province),
        );
    const isNearbyProvince =
        !/^(metro manila|national capital region|ncr)$/i.test(
            data.service_province.trim(),
        );
    const travelFee =
        selectedServiceArea?.starting_fee ??
        (isNearbyProvince ? outOfTownTravelFee : metroManilaTravelFee);
    const isOnRequestArea =
        Boolean(data.service_city) &&
        (selectedServiceArea?.level ?? 'on_request') === 'on_request';
    const isNotServedArea = selectedServiceArea?.level === 'not_served';
    const firstBookableDate = minimumBookingDate || localDateString();
    const lastBookableDate =
        maximumBookingDate ||
        `${Number(firstBookableDate.slice(0, 4)) + 2}${firstBookableDate.slice(4)}`;
    const isBookingDateOutOfRange = Boolean(
        data.booking_date &&
        (data.booking_date < firstBookableDate ||
            data.booking_date > lastBookableDate),
    );
    const quoteRequired =
        basePriceType === 'quote_required' ||
        isOnRequestArea ||
        selectedAddOns.some((item) => item.pricing_type === 'quote_required');
    const isRushBooking = Boolean(
        data.booking_date &&
        !isBookingDateOutOfRange &&
        rushBookingCutoffDate &&
        data.booking_date < rushBookingCutoffDate,
    );
    const isEarlyCallTime = Boolean(
        data.booking_time &&
        data.booking_time >= '01:00' &&
        data.booking_time <= '05:00',
    );
    const displayedAvailability: typeof availability = isBookingDateOutOfRange
        ? {
              state: 'unavailable',
              message:
                  data.booking_date < firstBookableDate
                      ? 'Past dates cannot be booked. Please choose today or a future date.'
                      : 'This date is too far ahead to book. Please choose a date within the next two years.',
          }
        : availability;

    useEffect(() => {
        if (data.booking_date && isBookingDateOutOfRange) {
            return;
        }

        const controller = new AbortController();

        if (!data.booking_date || (!data.service && !data.package_id)) {
            const timer = window.setTimeout(() => {
                setAvailability({ state: 'idle', message: '' });
            }, 0);

            return () => window.clearTimeout(timer);
        }

        const query = new URLSearchParams({
            booking_date: data.booking_date,
            ...(data.booking_time ? { booking_time: data.booking_time } : {}),
            ...(data.service ? { service: data.service } : {}),
            ...(data.package_id ? { package_id: String(data.package_id) } : {}),
        });

        const timer = window.setTimeout(() => {
            setAvailability({
                state: 'checking',
                message: 'Checking availability…',
            });

            fetch(`/book/availability?${query.toString()}`, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then(async (response) => {
                    if (!response.ok) {
                        throw new Error('Availability could not be checked.');
                    }

                    return (await response.json()) as {
                        available: boolean;
                        message: string;
                    };
                })
                .then((result) => {
                    setAvailability({
                        state: result.available ? 'available' : 'unavailable',
                        message: result.message,
                    });
                })
                .catch((error: unknown) => {
                    if (
                        error instanceof DOMException &&
                        error.name === 'AbortError'
                    ) {
                        return;
                    }

                    setAvailability({
                        state: 'error',
                        message:
                            'Availability could not be checked. You can still submit; the artist will verify your request.',
                    });
                });
        }, 0);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [
        data.booking_date,
        data.booking_time,
        data.package_id,
        data.service,
        firstBookableDate,
        isBookingDateOutOfRange,
    ]);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/book/locations?level=provinces', {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                const result = (await response.json()) as {
                    options?: LocationOption[];
                    message?: string;
                };

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                            'Province list is unavailable. Please refresh and try again.',
                    );
                }

                return result.options ?? [];
            })
            .then(setProvinceOptions)
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setLocationsUnavailable(true);
                setLocationMessage(
                    'The location list is unavailable. Enter the location details manually; you will still need to confirm the map pin.',
                );
            });

        return () => controller.abort();
    }, []);

    const selectedProvinceOption = provinceOptions.find(
        (province) =>
            province.name.toLowerCase() === data.service_province.toLowerCase(),
    );
    const selectedCityOption = cityOptions.find(
        (city) => city.name.toLowerCase() === data.service_city.toLowerCase(),
    );

    useEffect(() => {
        if (!selectedProvinceOption) {
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            level: 'cities',
            parent_code: selectedProvinceOption.code,
        });
        fetch(`/book/locations?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                const result = (await response.json()) as {
                    options?: LocationOption[];
                    message?: string;
                };

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                            'City list is unavailable. Please try again.',
                    );
                }

                return result.options ?? [];
            })
            .then(setCityOptions)
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setLocationsUnavailable(true);
                setLocationMessage(
                    'The location list is unavailable. Enter the location details manually; you will still need to confirm the map pin.',
                );
            });

        return () => controller.abort();
    }, [selectedProvinceOption]);

    useEffect(() => {
        if (!selectedCityOption) {
            return;
        }

        const controller = new AbortController();
        const params = new URLSearchParams({
            level: 'barangays',
            parent_code: selectedCityOption.code,
        });
        fetch(`/book/locations?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        })
            .then(async (response) => {
                const result = (await response.json()) as {
                    options?: LocationOption[];
                    message?: string;
                };

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                            'Barangay list is unavailable. Please try again.',
                    );
                }

                return result.options ?? [];
            })
            .then(setBarangayOptions)
            .catch((error: unknown) => {
                if (
                    error instanceof DOMException &&
                    error.name === 'AbortError'
                ) {
                    return;
                }

                setLocationsUnavailable(true);
                setLocationMessage(
                    'The location list is unavailable. Enter the location details manually; you will still need to confirm the map pin.',
                );
            });

        return () => controller.abort();
    }, [selectedCityOption]);

    const calculatedTravelFee = !data.service_city ? 0 : travelFee;
    const estimatedTotal =
        (basePrice ?? 0) +
        selectedAddOns.reduce(
            (sum, item) =>
                sum +
                (item.price == null
                    ? 0
                    : Number(item.price) * data.add_on_quantities[item.id]),
            0,
        ) +
        (isRushBooking ? rushBookingFee : 0) +
        (isEarlyCallTime ? earlyCallTimeFee : 0) +
        calculatedTravelFee;

    function clearBridalPartyAddOns(quantities: Record<number, number>) {
        const bridalPartyIds = new Set(
            addOns
                .filter((addOn) => isBridalPartyAddOn(addOn.name))
                .map((addOn) => addOn.id),
        );

        return Object.fromEntries(
            Object.entries(quantities).filter(
                ([id]) => !bridalPartyIds.has(Number(id)),
            ),
        ) as Record<number, number>;
    }

    function handleServiceChange(serviceName: string) {
        setData((previous) => ({
            ...previous,
            service: serviceName,
            package_id: null,
            add_on_quantities: /bridal|wedding/i.test(serviceName)
                ? previous.add_on_quantities
                : clearBridalPartyAddOns(previous.add_on_quantities),
        }));
    }

    function handlePackageChange(packageId: number | null) {
        const packageName =
            packages.find((pkg) => pkg.id === packageId)?.name ?? '';

        setData((previous) => ({
            ...previous,
            package_id: packageId,
            service: '',
            add_on_quantities: /bridal|wedding/i.test(packageName)
                ? previous.add_on_quantities
                : clearBridalPartyAddOns(previous.add_on_quantities),
        }));
    }

    function toggleAddOn(addOn: Offering) {
        const initialQuantity = usesQuantityLimits(addOn.name)
            ? addOn.add_on_min_quantity
            : 1;
        setData(
            'add_on_quantities',
            Object.hasOwn(data.add_on_quantities, addOn.id)
                ? Object.fromEntries(
                      Object.entries(data.add_on_quantities).filter(
                          ([id]) => Number(id) !== addOn.id,
                      ),
                  )
                : { ...data.add_on_quantities, [addOn.id]: initialQuantity },
        );
    }

    function changeAddOnQuantity(addOn: Offering, rawValue: string) {
        const parsed = Number.parseInt(rawValue, 10);
        const quantity = Number.isNaN(parsed)
            ? addOn.add_on_min_quantity
            : Math.min(
                  addOn.add_on_max_quantity,
                  Math.max(addOn.add_on_min_quantity, parsed),
              );
        setData('add_on_quantities', {
            ...data.add_on_quantities,
            [addOn.id]: quantity,
        });
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!data.address_confirmed) {
            setAddressCheck((current) => ({
                ...current,
                state: current.state === 'verified' ? 'verified' : 'error',
                message:
                    'Locate the address and confirm the map pin before sending your request.',
            }));
            document.getElementById('venue_street')?.focus();

            return;
        }

        if (data.booking_date && isBookingDateOutOfRange) {
            setAvailability({
                state: 'unavailable',
                message:
                    data.booking_date < firstBookableDate
                        ? 'Past dates cannot be booked. Please choose today or a future date.'
                        : 'This date is too far ahead to book. Please choose a date within the next two years.',
            });
            document.getElementById('booking_date')?.focus();

            return;
        }

        post('/book', { forceFormData: true });
    }

    function resetVenueLocation() {
        setData((previous) => ({
            ...previous,
            venue_latitude: null,
            venue_longitude: null,
            address_confirmed: false,
        }));
        setMapOpen(false);
        setAddressCheck({ state: 'idle', message: '' });
    }

    async function locateVenueOnMap() {
        if (!data.service_city || !data.service_province) {
            return;
        }

        setData('address_confirmed', false);
        setAddressCheck({
            state: 'locating',
            message: 'Locating the selected city on the map…',
        });

        try {
            const params = new URLSearchParams({
                service_city: data.service_city,
                service_province: data.service_province,
            });
            const response = await fetch(
                `/book/map-center?${params.toString()}`,
                {
                    headers: { Accept: 'application/json' },
                },
            );
            const result = (await response.json()) as {
                latitude?: number;
                longitude?: number;
                message?: string;
            };

            if (
                !response.ok ||
                result.latitude == null ||
                result.longitude == null
            ) {
                throw new Error(
                    result.message ||
                        'We could not locate that city. Check the province and city.',
                );
            }

            setData((previous) => ({
                ...previous,
                venue_latitude: result.latitude!,
                venue_longitude: result.longitude!,
                address_confirmed: false,
            }));
            setMapOpen(true);
            setAddressCheck({
                state: 'located',
                message:
                    'Drag the pin to the exact venue, then confirm its location.',
            });
        } catch (error) {
            setAddressCheck({
                state: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'We could not locate that city. Please try again.',
            });
        }
    }

    async function verifyVenueAddress() {
        if (data.venue_latitude == null || data.venue_longitude == null) {
            setAddressCheck({
                state: 'error',
                message: 'Locate the map and place the pin at the venue first.',
            });

            return;
        }

        setData('address_confirmed', false);
        setAddressCheck({
            state: 'checking',
            message:
                'Checking the address and map pin for a street-level match…',
        });

        try {
            const xsrfCookie = document.cookie
                .split('; ')
                .find((item) => item.startsWith('XSRF-TOKEN='));
            const response = await fetch('/book/verify-address', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(xsrfCookie
                        ? {
                              'X-XSRF-TOKEN': decodeURIComponent(
                                  xsrfCookie.slice('XSRF-TOKEN='.length),
                              ),
                          }
                        : {}),
                },
                body: JSON.stringify({
                    service_city: data.service_city,
                    service_province: data.service_province,
                    venue_barangay: data.venue_barangay,
                    venue_street: data.venue_street,
                    venue_landmark: data.venue_landmark,
                    venue_latitude: data.venue_latitude,
                    venue_longitude: data.venue_longitude,
                }),
            });
            const result = (await response.json()) as {
                verified: boolean;
                message: string;
                formatted_address?: string;
                map_url?: string;
            };

            if (!response.ok || !result.verified) {
                throw new Error(
                    result.message || 'We could not verify this address.',
                );
            }

            setAddressCheck({
                state: 'verified',
                message: result.message,
                formattedAddress: result.formatted_address,
                mapUrl: result.map_url,
            });
            setData('address_confirmed', true);
        } catch (error) {
            setAddressCheck({
                state: 'error',
                message:
                    error instanceof Error
                        ? error.message
                        : 'We could not verify this address. Please try again.',
            });
        }
    }

    function handleMapPinMove(latitude: number, longitude: number) {
        setData((previous) => ({
            ...previous,
            venue_latitude: latitude,
            venue_longitude: longitude,
            address_confirmed: false,
        }));
        setAddressCheck({
            state: 'located',
            message:
                'Pin moved. Confirm the location when it is over the venue.',
        });
    }

    function handleNewInspoChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;

        setData((previous) => ({
            ...previous,
            new_inspo_image: file,
            inspo_image_id: file ? null : previous.inspo_image_id,
        }));

        setNewPreview(file ? URL.createObjectURL(file) : null);
    }

    function selectExisting(id: number) {
        setData((previous) => ({
            ...previous,
            inspo_image_id: id,
            new_inspo_image: null,
        }));

        setNewPreview(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    useEffect(() => {
        if (!viewingUrl) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setViewingUrl(null);
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [viewingUrl]);

    return (
        <>
            <Head title="Book a Session" />

            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="book"
                />

                <main className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#e8d7cf]/50 blur-2xl" />
                        <div className="relative">
                            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                Book a Session
                            </p>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                                Let&apos;s get you glammed
                            </h1>
                            <p className="mt-2 max-w-xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                                Choose your look and appointment details. Your
                                artist will confirm the booking with you.
                            </p>
                        </div>
                    </section>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-6 rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-lg shadow-[#c9a66b]/10 sm:p-7"
                    >
                        <div className="grid gap-2">
                            <Label
                                htmlFor="offering"
                                className="flex items-center gap-1.5 text-[#1a1a1a]"
                            >
                                <Brush className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                Category
                                <RequiredAsterisk />
                            </Label>
                            <select
                                id="offering"
                                value={
                                    data.service
                                        ? `service:${encodeURIComponent(data.service)}`
                                        : data.package_id != null
                                          ? `package:${data.package_id}`
                                          : ''
                                }
                                onChange={(event) => {
                                    const [kind, value] =
                                        event.target.value.split(':', 2);

                                    if (kind === 'service') {
                                        handleServiceChange(
                                            value
                                                ? decodeURIComponent(value)
                                                : '',
                                        );
                                    } else if (kind === 'package') {
                                        handlePackageChange(Number(value));
                                    } else {
                                        handleServiceChange('');
                                    }
                                }}
                                className={fieldClass}
                            >
                                <option value="">Select a category</option>
                                <optgroup label="Services">
                                    {services.map((service) => (
                                        <option
                                            key={service.id}
                                            value={`service:${encodeURIComponent(service.name)}`}
                                        >
                                            {service.name}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Packages">
                                    {packages.map((pkg) => (
                                        <option
                                            key={pkg.id}
                                            value={`package:${pkg.id}`}
                                        >
                                            {pkg.name}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                            <p className="text-xs text-[#4a4a4a]">
                                Choose only one. Add-ons below are optional.
                            </p>
                            <InputError message={errors.service} />
                            <InputError message={errors.package_id} />
                        </div>

                        {visibleAddOns.length > 0 && (
                            <fieldset className="grid gap-3 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                <legend className="px-1 font-semibold text-[#1a1a1a]">
                                    Optional add-ons
                                </legend>
                                {visibleAddOns.map((addOn) => {
                                    const selectedQuantity =
                                        data.add_on_quantities[addOn.id];

                                    return (
                                        <label
                                            key={addOn.id}
                                            className="flex cursor-pointer items-start gap-3 rounded-xl bg-white p-3"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    selectedQuantity != null
                                                }
                                                onChange={() =>
                                                    toggleAddOn(addOn)
                                                }
                                                className="mt-1 accent-[#8a6a2f]"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-medium text-[#1a1a1a]">
                                                    {addOn.name}
                                                </span>
                                                {addOn.description && (
                                                    <span className="mt-0.5 block text-xs text-[#4a4a4a]">
                                                        {addOn.description}
                                                    </span>
                                                )}
                                                <span className="mt-1 block text-xs text-[#4a4a4a]">
                                                    {addOn.pricing_type ===
                                                    'quote_required'
                                                        ? 'Price confirmed after booking'
                                                        : `${addOn.pricing_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(addOn.price ?? 0).toLocaleString('en-PH')} each`}
                                                    {usesQuantityLimits(
                                                        addOn.name,
                                                    ) &&
                                                    addOn.add_on_min_quantity >
                                                        1
                                                        ? ` · minimum ${addOn.add_on_min_quantity}`
                                                        : ''}
                                                </span>
                                            </span>
                                            {selectedQuantity != null &&
                                                usesQuantityLimits(
                                                    addOn.name,
                                                ) && (
                                                    <span className="grid shrink-0 gap-1 text-xs font-medium text-[#4a4a4a]">
                                                        Qty
                                                        <input
                                                            aria-label={`${addOn.name} quantity`}
                                                            type="number"
                                                            min={
                                                                addOn.add_on_min_quantity
                                                            }
                                                            max={
                                                                addOn.add_on_max_quantity
                                                            }
                                                            step="1"
                                                            value={
                                                                selectedQuantity
                                                            }
                                                            onChange={(event) =>
                                                                changeAddOnQuantity(
                                                                    addOn,
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            onClick={(event) =>
                                                                event.stopPropagation()
                                                            }
                                                            className="w-20 rounded-lg border border-[#d7c0a2] px-2 py-1 text-sm text-[#1a1a1a]"
                                                        />
                                                    </span>
                                                )}
                                            <InputError
                                                message={
                                                    (
                                                        errors as unknown as Record<
                                                            string,
                                                            string | undefined
                                                        >
                                                    )[
                                                        `add_on_quantities.${addOn.id}`
                                                    ]
                                                }
                                            />
                                        </label>
                                    );
                                })}
                                <InputError
                                    message={errors.add_on_quantities}
                                />
                            </fieldset>
                        )}

                        {baseOffering && (
                            <aside className="rounded-2xl border border-[#e8d7cf] bg-gradient-to-r from-[#fffcf8] to-[#f4e9e5] p-4 text-sm">
                                <div className="flex justify-between gap-3 font-semibold text-[#1a1a1a]">
                                    <span>
                                        {selectedPackage
                                            ? selectedPackage.name
                                            : selectedService?.name}
                                    </span>
                                    <span className="shrink-0 text-[#8a6a2f]">
                                        {basePriceType === 'quote_required'
                                            ? 'Quote required'
                                            : `${basePriceType === 'starting_at' ? 'Starting at ' : ''}₱${(basePrice ?? 0).toLocaleString('en-PH')}`}
                                    </span>
                                </div>
                                {selectedAddOns.map((item) => (
                                    <div
                                        key={item.id}
                                        className="mt-2 flex justify-between gap-3 text-[#4a4a4a]"
                                    >
                                        <span>
                                            {item.name} ×{' '}
                                            {data.add_on_quantities[item.id]}
                                        </span>
                                        <span className="shrink-0">
                                            {item.pricing_type ===
                                            'quote_required'
                                                ? 'Quote'
                                                : `₱${(Number(item.price ?? 0) * data.add_on_quantities[item.id]).toLocaleString('en-PH')}`}
                                        </span>
                                    </div>
                                ))}
                                {isRushBooking && (
                                    <div className="mt-2 flex justify-between gap-3 text-[#4a4a4a]">
                                        <span>Rush booking fee</span>
                                        <span className="shrink-0">
                                            ₱
                                            {rushBookingFee.toLocaleString(
                                                'en-PH',
                                            )}
                                        </span>
                                    </div>
                                )}
                                {isEarlyCallTime && (
                                    <div className="mt-2 flex justify-between gap-3 text-[#4a4a4a]">
                                        <span>Early call time fee</span>
                                        <span className="shrink-0">
                                            ₱
                                            {earlyCallTimeFee.toLocaleString(
                                                'en-PH',
                                            )}
                                        </span>
                                    </div>
                                )}
                                {data.service_city && (
                                    <div className="mt-2 flex justify-between gap-3 text-[#4a4a4a]">
                                        <span>
                                            {isOnRequestArea
                                                ? 'On-request transportation (starting fee)'
                                                : isNearbyProvince
                                                  ? 'Out-of-town transportation (starting fee)'
                                                  : 'Metro Manila transportation (starting fee)'}
                                        </span>
                                        <span className="shrink-0">
                                            ₱{travelFee.toLocaleString('en-PH')}
                                        </span>
                                    </div>
                                )}
                                <div className="mt-3 flex justify-between border-t border-[#e8d7cf] pt-3 font-semibold text-[#1a1a1a]">
                                    <span>
                                        {quoteRequired
                                            ? 'Estimated total (final price to confirm)'
                                            : 'Estimated total'}
                                    </span>
                                    <span>
                                        ₱
                                        {estimatedTotal.toLocaleString('en-PH')}
                                    </span>
                                </div>
                            </aside>
                        )}

                        <div className="grid gap-2">
                            <Label
                                htmlFor="service_province"
                                className="text-[#1a1a1a]"
                            >
                                Province or Metro Manila
                                <RequiredAsterisk />
                            </Label>
                            {locationsUnavailable ? (
                                <input
                                    id="service_province"
                                    type="text"
                                    autoComplete="address-level1"
                                    value={data.service_province}
                                    onChange={(event) => {
                                        setData((previous) => ({
                                            ...previous,
                                            service_province:
                                                event.target.value,
                                            service_city: '',
                                            venue_barangay: '',
                                            venue_latitude: null,
                                            venue_longitude: null,
                                            address_confirmed: false,
                                        }));
                                        setCityOptions([]);
                                        setBarangayOptions([]);
                                        setMapOpen(false);
                                        setAddressCheck({
                                            state: 'idle',
                                            message: '',
                                        });
                                    }}
                                    className={`${fieldClass} min-h-12`}
                                    placeholder="Type province or Metro Manila"
                                    required
                                />
                            ) : (
                                <select
                                    id="service_province"
                                    value={data.service_province}
                                    onChange={(event) => {
                                        setData((previous) => ({
                                            ...previous,
                                            service_province:
                                                event.target.value,
                                            service_city: '',
                                            venue_barangay: '',
                                            venue_latitude: null,
                                            venue_longitude: null,
                                            address_confirmed: false,
                                        }));
                                        setCityOptions([]);
                                        setBarangayOptions([]);
                                        setMapOpen(false);
                                        setAddressCheck({
                                            state: 'idle',
                                            message: '',
                                        });
                                    }}
                                    className={fieldClass}
                                    required
                                >
                                    <option value="">Choose a province</option>
                                    {provinceOptions.map((province) => (
                                        <option
                                            key={province.code}
                                            value={province.name}
                                        >
                                            {province.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <InputError message={errors.service_province} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="service_city"
                                className="text-[#1a1a1a]"
                            >
                                City or municipality
                                <RequiredAsterisk />
                            </Label>
                            {locationsUnavailable ? (
                                <input
                                    id="service_city"
                                    type="text"
                                    autoComplete="address-level2"
                                    value={data.service_city}
                                    onChange={(event) => {
                                        setData((previous) => ({
                                            ...previous,
                                            service_city: event.target.value,
                                            venue_barangay: '',
                                            venue_latitude: null,
                                            venue_longitude: null,
                                            address_confirmed: false,
                                        }));
                                        setBarangayOptions([]);
                                        setMapOpen(false);
                                        setAddressCheck({
                                            state: 'idle',
                                            message: '',
                                        });
                                    }}
                                    className={`${fieldClass} min-h-12`}
                                    placeholder="Type city or municipality"
                                    required
                                    disabled={!data.service_province}
                                />
                            ) : (
                                <select
                                    id="service_city"
                                    value={data.service_city}
                                    onChange={(event) => {
                                        setData((previous) => ({
                                            ...previous,
                                            service_city: event.target.value,
                                            venue_barangay: '',
                                            venue_latitude: null,
                                            venue_longitude: null,
                                            address_confirmed: false,
                                        }));
                                        setBarangayOptions([]);
                                        setMapOpen(false);
                                        setAddressCheck({
                                            state: 'idle',
                                            message: '',
                                        });
                                    }}
                                    className={fieldClass}
                                    required
                                    disabled={
                                        !data.service_province ||
                                        cityOptions.length === 0
                                    }
                                >
                                    <option value="">
                                        Choose a city or municipality
                                    </option>
                                    {cityOptions
                                        .filter((city) => {
                                            const cityArea =
                                                serviceAreas.find(
                                                    (area) =>
                                                        normalizeLocationName(
                                                            area.name,
                                                        ) ===
                                                        normalizeLocationName(
                                                            city.name,
                                                        ),
                                                ) ??
                                                serviceAreas.find(
                                                    (area) =>
                                                        normalizeLocationName(
                                                            area.name,
                                                        ) ===
                                                        normalizeLocationName(
                                                            data.service_province,
                                                        ),
                                                );

                                            return (
                                                cityArea?.level !== 'not_served'
                                            );
                                        })
                                        .map((city) => {
                                            const cityArea =
                                                serviceAreas.find(
                                                    (area) =>
                                                        normalizeLocationName(
                                                            area.name,
                                                        ) ===
                                                        normalizeLocationName(
                                                            city.name,
                                                        ),
                                                ) ??
                                                serviceAreas.find(
                                                    (area) =>
                                                        normalizeLocationName(
                                                            area.name,
                                                        ) ===
                                                        normalizeLocationName(
                                                            data.service_province,
                                                        ),
                                                );
                                            const status =
                                                cityArea?.level ?? 'on_request';

                                            return (
                                                <option
                                                    key={city.code}
                                                    value={city.name}
                                                >
                                                    {city.name}
                                                    {status === 'on_request'
                                                        ? ' — On request'
                                                        : ''}
                                                    {cityArea?.starting_fee
                                                        ? ` · from ₱${cityArea.starting_fee.toLocaleString('en-PH')}`
                                                        : ''}
                                                </option>
                                            );
                                        })}
                                </select>
                            )}
                            <InputError message={errors.service_city} />
                            {data.service_city && (
                                <p
                                    className={`text-xs ${isOnRequestArea ? 'text-[#76551e]' : 'text-[#4a4a4a]'}`}
                                >
                                    {isNotServedArea
                                        ? 'Trixie is not accepting bookings in this area.'
                                        : isOnRequestArea
                                          ? 'On request: Trixie will review the location and appointment, then send a travel-fee quote for you to approve before any deposit is due.'
                                          : 'This area is covered. Trixie will confirm the starting travel fee.'}
                                    {selectedServiceArea?.note
                                        ? ` ${selectedServiceArea.note}`
                                        : ''}
                                </p>
                            )}
                            {((selectedProvinceOption &&
                                cityOptions.length === 0) ||
                                (selectedCityOption &&
                                    barangayOptions.length === 0)) &&
                                !locationMessage && (
                                    <p
                                        role="status"
                                        className="text-xs text-[#62594f]"
                                    >
                                        Loading location options…
                                    </p>
                                )}
                            {locationMessage && (
                                <p
                                    role="status"
                                    className={`text-xs ${locationsUnavailable ? 'text-[#76551e]' : 'text-[#7a3028]'}`}
                                >
                                    {locationMessage}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="venue_barangay"
                                className="text-[#1a1a1a]"
                            >
                                Barangay
                                <RequiredAsterisk />
                            </Label>
                            {locationsUnavailable ? (
                                <input
                                    id="venue_barangay"
                                    type="text"
                                    autoComplete="address-level3"
                                    value={data.venue_barangay}
                                    onChange={(event) => {
                                        setData(
                                            'venue_barangay',
                                            event.target.value,
                                        );
                                        resetVenueLocation();
                                    }}
                                    className={`${fieldClass} min-h-12`}
                                    placeholder="Type barangay"
                                    required
                                    disabled={!data.service_city}
                                />
                            ) : (
                                <select
                                    id="venue_barangay"
                                    value={data.venue_barangay}
                                    onChange={(event) => {
                                        setData(
                                            'venue_barangay',
                                            event.target.value,
                                        );
                                        resetVenueLocation();
                                    }}
                                    className={fieldClass}
                                    required
                                    disabled={
                                        !data.service_city ||
                                        barangayOptions.length === 0
                                    }
                                >
                                    <option value="">Choose a barangay</option>
                                    {barangayOptions.map((barangay) => (
                                        <option
                                            key={barangay.code}
                                            value={barangay.name}
                                        >
                                            {barangay.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <InputError message={errors.venue_barangay} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="venue_street"
                                    className="text-[#1a1a1a]"
                                >
                                    Street, building, and house number
                                    <RequiredAsterisk />
                                </Label>
                                <input
                                    id="venue_street"
                                    type="text"
                                    autoComplete="street-address"
                                    value={data.venue_street}
                                    onChange={(event) => {
                                        setData(
                                            'venue_street',
                                            event.target.value,
                                        );
                                        resetVenueLocation();
                                    }}
                                    required
                                    maxLength={500}
                                    placeholder="House or unit number, street, building"
                                    className={`${fieldClass} min-h-12`}
                                />
                                <InputError message={errors.venue_street} />
                            </div>
                            <div className="grid content-start gap-2">
                                <Label
                                    htmlFor="venue_landmark"
                                    className="text-[#1a1a1a]"
                                >
                                    Landmark{' '}
                                    <span className="font-normal text-[#62594f]">
                                        (optional)
                                    </span>
                                </Label>
                                <input
                                    id="venue_landmark"
                                    type="text"
                                    value={data.venue_landmark}
                                    onChange={(event) => {
                                        setData(
                                            'venue_landmark',
                                            event.target.value,
                                        );
                                        resetVenueLocation();
                                    }}
                                    maxLength={255}
                                    placeholder="Near a church, school, or shop"
                                    className={`${fieldClass} min-h-12`}
                                />
                                <InputError message={errors.venue_landmark} />
                            </div>
                        </div>

                        <div className="grid gap-3">
                            <Button
                                type="button"
                                onClick={locateVenueOnMap}
                                disabled={
                                    !data.service_city ||
                                    !data.service_province ||
                                    !data.venue_barangay ||
                                    data.venue_street.trim().length < 3 ||
                                    addressCheck.state === 'locating'
                                }
                                className="min-h-12 w-full bg-[#8a6a2f] text-white hover:bg-[#725625] sm:w-fit"
                            >
                                <MapPin className="mr-2 h-4 w-4" />
                                {addressCheck.state === 'locating'
                                    ? 'Locating city…'
                                    : mapOpen
                                      ? 'Re-center map on city'
                                      : 'Locate venue on map'}
                            </Button>
                            {mapOpen &&
                                data.venue_latitude != null &&
                                data.venue_longitude != null && (
                                    <>
                                        <Suspense
                                            fallback={
                                                <div
                                                    role="status"
                                                    className="min-h-[300px] rounded-xl bg-[#f5f1eb] p-4 text-sm text-[#62594f] sm:min-h-[360px]"
                                                >
                                                    Loading map…
                                                </div>
                                            }
                                        >
                                            <BookingLocationMap
                                                latitude={data.venue_latitude}
                                                longitude={data.venue_longitude}
                                                onMove={handleMapPinMove}
                                            />
                                        </Suspense>
                                        <Button
                                            type="button"
                                            onClick={verifyVenueAddress}
                                            disabled={
                                                addressCheck.state ===
                                                    'checking' ||
                                                data.address_confirmed
                                            }
                                            className="min-h-12 w-full bg-[#8a6a2f] text-white hover:bg-[#725625] sm:w-fit"
                                        >
                                            {addressCheck.state === 'checking'
                                                ? 'Checking pin…'
                                                : data.address_confirmed
                                                  ? 'Pin location confirmed'
                                                  : 'Confirm pin location'}
                                        </Button>
                                    </>
                                )}
                            {addressCheck.message && (
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className={`grid gap-2 rounded-xl border px-3 py-2 text-sm ${
                                        addressCheck.state === 'verified'
                                            ? 'border-green-200 bg-green-50 text-green-900'
                                            : addressCheck.state === 'error'
                                              ? 'border-red-200 bg-red-50 text-red-800'
                                              : 'border-[#e8d7cf] bg-[#fffcf8] text-[#4a4a4a]'
                                    }`}
                                >
                                    <span>{addressCheck.message}</span>
                                    {addressCheck.state === 'verified' &&
                                        addressCheck.formattedAddress && (
                                            <>
                                                <span className="font-medium">
                                                    {
                                                        addressCheck.formattedAddress
                                                    }
                                                </span>
                                                <a
                                                    href={addressCheck.mapUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-fit underline underline-offset-2"
                                                >
                                                    Open map and check the pin
                                                </a>
                                            </>
                                        )}
                                </div>
                            )}
                            <p className="text-xs text-[#62594f]">
                                Your address and map pin are sent to Geoapify to
                                check for a street-level match. Successful
                                lookup requests may be retained for up to 24
                                hours; the map uses OpenStreetMap data.
                            </p>
                            <InputError message={errors.address_confirmed} />
                        </div>

                        <div className="grid items-start gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="booking_date"
                                    className="flex items-center gap-1.5 text-[#1a1a1a]"
                                >
                                    <CalendarDays className="h-4 w-4 text-[#8a6a2f]" />
                                    Date
                                    <RequiredAsterisk />
                                </Label>
                                <input
                                    id="booking_date"
                                    type="date"
                                    value={data.booking_date}
                                    onChange={(event) =>
                                        setData(
                                            'booking_date',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    min={firstBookableDate}
                                    max={lastBookableDate}
                                    className={fieldClass}
                                />
                                <InputError message={errors.booking_date} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="booking_time"
                                    className="flex items-center gap-1.5 text-[#1a1a1a]"
                                >
                                    <Clock className="h-4 w-4 text-[#8a6a2f]" />
                                    Time
                                    <RequiredAsterisk />
                                </Label>
                                <input
                                    id="booking_time"
                                    type="time"
                                    value={data.booking_time}
                                    onChange={(event) =>
                                        setData(
                                            'booking_time',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    className={fieldClass}
                                />
                                <InputError message={errors.booking_time} />
                            </div>
                        </div>

                        {displayedAvailability.state !== 'idle' && (
                            <p
                                role="status"
                                aria-live="polite"
                                className={`rounded-xl px-3 py-2 text-sm leading-5 ${
                                    displayedAvailability.state ===
                                    'unavailable'
                                        ? 'border border-red-200 bg-red-50 text-red-800'
                                        : displayedAvailability.state ===
                                            'available'
                                          ? 'border border-green-200 bg-green-50 text-green-800'
                                          : 'border border-[#E8D8A8] bg-[#FFF9E8] text-[#765C1F]'
                                }`}
                            >
                                {displayedAvailability.message}
                            </p>
                        )}

                        <section
                            className="grid gap-3 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4 sm:p-5"
                            aria-labelledby="booking-schedule-notes-heading"
                        >
                            <h2
                                id="booking-schedule-notes-heading"
                                className="flex items-center gap-2 text-sm font-semibold text-[#1a1a1a]"
                            >
                                <Clock className="h-4 w-4 text-[#8a6a2f]" />
                                Scheduling notes
                            </h2>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                                <div className="rounded-xl border border-[#eee4d7] bg-white p-3">
                                    <h3 className="text-xs font-semibold tracking-wide text-[#8a6a2f] uppercase">
                                        Session length
                                    </h3>
                                    <p className="mt-1 text-sm leading-5 text-[#4a4a4a]">
                                        Regular sessions take about 1½ hours.
                                        Bridal and wedding bookings reserve up
                                        to 3 hours.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[#eee4d7] bg-white p-3">
                                    <h3 className="text-xs font-semibold tracking-wide text-[#8a6a2f] uppercase">
                                        Daily availability
                                    </h3>
                                    <p className="mt-1 text-sm leading-5 text-[#4a4a4a]">
                                        The artist usually accepts up to two
                                        bookings per day. Photo and event
                                        bookings depend on availability.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[#eee4d7] bg-white p-3">
                                    <h3 className="text-xs font-semibold tracking-wide text-[#8a6a2f] uppercase">
                                        Rush bookings
                                    </h3>
                                    <p className="mt-1 text-sm leading-5 text-[#4a4a4a]">
                                        Bookings made less than 7 days ahead are
                                        subject to availability and include a ₱
                                        {rushBookingFee.toLocaleString('en-PH')}{' '}
                                        rush fee.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-[#eee4d7] bg-white p-3">
                                    <h3 className="text-xs font-semibold tracking-wide text-[#8a6a2f] uppercase">
                                        Early call time
                                    </h3>
                                    <p className="mt-1 text-sm leading-5 text-[#4a4a4a]">
                                        Start times from 1:00 AM to 5:00 AM
                                        include a ₱
                                        {earlyCallTimeFee.toLocaleString(
                                            'en-PH',
                                        )}{' '}
                                        early call-time fee.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {isRushBooking && (
                            <p
                                role="status"
                                className="rounded-xl border border-[#E8D8A8] bg-[#FFF9E8] px-3 py-2 text-sm leading-5 text-[#765C1F]"
                            >
                                This is a rush booking. It is subject to the
                                artist&apos;s availability, and a ₱
                                {rushBookingFee.toLocaleString('en-PH')} fee has
                                been added to your estimate.
                            </p>
                        )}
                        {isEarlyCallTime && (
                            <p
                                role="status"
                                className="rounded-xl border border-[#E8D8A8] bg-[#FFF9E8] px-3 py-2 text-sm leading-5 text-[#765C1F]"
                            >
                                This start time qualifies for the ₱
                                {earlyCallTimeFee.toLocaleString('en-PH')} early
                                call-time fee.
                            </p>
                        )}

                        <div className="grid gap-2 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                            <Label className="flex items-center gap-1.5 text-[#1a1a1a]">
                                <ImagePlus className="h-4 w-4 text-[#8a6a2f]" />
                                Makeup Inspiration
                                <span className="font-normal text-[#4a4a4a]">
                                    (optional)
                                </span>
                            </Label>

                            <p className="text-xs text-[#4a4a4a]">
                                Pick from your Inspiration History or upload a
                                new photo — it&apos;s saved to your profile and
                                it is saved to your account and your artist can
                                view it for your booking.
                            </p>

                            {inspoImages.length > 0 && (
                                <>
                                    <p className="mt-1 text-xs font-semibold text-[#1a1a1a]">
                                        Your Inspiration History
                                    </p>

                                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                        {inspoImages.map((image) => (
                                            <div
                                                key={image.id}
                                                className="group relative"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        selectExisting(image.id)
                                                    }
                                                    className={`block aspect-square w-full overflow-hidden rounded-lg border-2 transition ${
                                                        data.inspo_image_id ===
                                                        image.id
                                                            ? 'border-[#8a6a2f] ring-2 ring-[#8a6a2f]/40'
                                                            : 'border-transparent hover:border-[#c9a66b]'
                                                    }`}
                                                >
                                                    <img
                                                        src={image.url}
                                                        alt={
                                                            image.caption ??
                                                            'Inspiration'
                                                        }
                                                        className="h-full w-full object-cover"
                                                    />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewingUrl(image.url)
                                                    }
                                                    className="absolute right-1 bottom-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/70"
                                                    aria-label="View full image"
                                                >
                                                    <ImagePlus className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    id="new-inspo-upload"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleNewInspoChange}
                                    className="hidden"
                                />

                                {newPreview && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setViewingUrl(newPreview)
                                        }
                                        className="h-16 w-16 overflow-hidden rounded-lg border-2 border-[#8a6a2f]"
                                    >
                                        <img
                                            src={newPreview}
                                            alt="New upload preview"
                                            className="h-full w-full object-cover"
                                        />
                                    </button>
                                )}

                                <label
                                    htmlFor="new-inspo-upload"
                                    className="cursor-pointer rounded-full border border-[#c9a66b] bg-white px-4 py-1.5 text-xs font-semibold text-[#8a6a2f] transition hover:bg-[#f4e9e5]"
                                >
                                    {data.new_inspo_image
                                        ? 'Change new photo'
                                        : '+ Upload Inspiration'}
                                </label>

                                <Link
                                    href="/inspo"
                                    className="text-xs font-semibold text-[#4a4a4a] underline-offset-2 hover:underline"
                                >
                                    View full history
                                </Link>
                            </div>

                            <InputError message={errors.new_inspo_image} />
                            <InputError message={errors.inspo_image_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-[#1a1a1a]">
                                Notes{' '}
                                <span className="font-normal text-[#4a4a4a]">
                                    (optional)
                                </span>
                            </Label>
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(event) =>
                                    setData('notes', event.target.value)
                                }
                                rows={3}
                                maxLength={420}
                                placeholder="Allergies, preferred style, or anything else your artist should know..."
                                className={`${fieldClass} resize-none`}
                            />
                            <InputError message={errors.notes} />
                        </div>

                        <section
                            className="grid gap-4 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4 sm:p-5"
                            aria-labelledby="booking-terms-heading"
                        >
                            <h2
                                id="booking-terms-heading"
                                className="font-semibold text-[#1a1a1a]"
                            >
                                Booking terms and conditions
                            </h2>
                            <div className="grid items-start gap-3 sm:grid-cols-2 sm:gap-4">
                                <div className="grid content-start gap-3">
                                    <p className="text-sm leading-6 text-[#4a4a4a]">
                                        {termsIntroduction}
                                    </p>
                                    <div className="rounded-xl border border-[#eadcc7] bg-white p-3 sm:p-4">
                                        <h3 className="text-xs font-semibold tracking-wide text-[#8a6a2f] uppercase">
                                            Payment details
                                        </h3>
                                        <p className="mt-2 text-sm font-medium text-[#1a1a1a]">
                                            {paymentLines[0]?.replace(
                                                /^Mode of payment:\s*/i,
                                                '',
                                            )}
                                        </p>
                                        {paymentLines.length > 1 && (
                                            <p className="mt-1 text-sm leading-5 text-[#4a4a4a]">
                                                {paymentLines
                                                    .slice(1)
                                                    .join(' ')}
                                            </p>
                                        )}
                                        <p className="mt-2 border-t border-[#eee4d7] pt-2 text-xs leading-5 text-[#6b625a]">
                                            Bank transfer is also accepted.
                                            Contact the artist for bank account
                                            details.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid content-start gap-3">
                                    <div className="rounded-xl bg-[#f7f1e8] p-3 sm:p-4">
                                        <h3 className="text-sm font-semibold text-[#1a1a1a]">
                                            {noteLines[0]?.replace(/:$/, '')}
                                        </h3>
                                        <ul className="mt-2 grid gap-2 text-sm leading-5 text-[#4a4a4a]">
                                            {noteLines.slice(1).map((note) => (
                                                <li
                                                    key={note}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className="mt-0.5 text-[#8a6a2f]"
                                                    >
                                                        •
                                                    </span>
                                                    <span>
                                                        {note.replace(
                                                            /^•\s*/,
                                                            '',
                                                        )}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <p className="text-sm leading-6 whitespace-pre-line text-[#4a4a4a]">
                                        {closingText}
                                    </p>
                                </div>
                            </div>
                            <label
                                htmlFor="terms_accepted"
                                className="flex cursor-pointer items-start gap-2 border-t border-[#eadcc7] pt-3 text-sm leading-5 text-[#1a1a1a]"
                            >
                                <input
                                    id="terms_accepted"
                                    type="checkbox"
                                    checked={data.terms_accepted}
                                    onChange={(event) =>
                                        setData(
                                            'terms_accepted',
                                            event.target.checked,
                                        )
                                    }
                                    required
                                    className="mt-1 accent-[#8a6a2f]"
                                />
                                <span>
                                    I have read and agree to the booking terms
                                    and conditions.
                                    <RequiredAsterisk />
                                </span>
                            </label>
                            <InputError message={errors.terms_accepted} />
                        </section>

                        <Button
                            type="submit"
                            disabled={
                                !artist ||
                                (services.length === 0 &&
                                    packages.length === 0) ||
                                (!data.service && !data.package_id) ||
                                !data.terms_accepted ||
                                displayedAvailability.state === 'checking' ||
                                displayedAvailability.state === 'unavailable' ||
                                processing
                            }
                            className="w-full rounded-full bg-[#8a6a2f] text-white shadow-md shadow-[#8a6a2f]/25 transition duration-200 hover:bg-[#8a6a2f] hover:shadow-lg disabled:opacity-50"
                        >
                            {processing && <Spinner />}
                            <Sparkles className="h-4 w-4" />
                            Confirm Booking
                        </Button>
                    </form>
                </main>
            </div>

            {viewingUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setViewingUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingUrl(null)}
                        aria-label="Close image"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <img
                        src={viewingUrl}
                        alt="Full-size inspiration"
                        className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
