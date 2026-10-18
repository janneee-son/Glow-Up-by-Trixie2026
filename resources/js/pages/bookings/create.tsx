import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Brush,
    CalendarDays,
    Clock,
    ImagePlus,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import InputError from '@/components/input-error';
import RequiredAsterisk from '@/components/required-asterisk';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

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
    rushBookingCutoffDate?: string | null;
    rushBookingFee?: number;
    earlyCallTimeFee?: number;
    metroManilaTravelFee?: number;
    outOfTownTravelFee?: number;
    serviceCities?: { metroManila: string[]; nearbyProvince: string[] };
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

export default function CreateBooking({
    artist,
    savedAddress,
    inspoImages: inspoImagesProp,
    services: servicesProp,
    packages: packagesProp,
    addOns: addOnsProp,
    minimumBookingDate,
    rushBookingCutoffDate,
    rushBookingFee = 500,
    earlyCallTimeFee = 500,
    metroManilaTravelFee = 500,
    outOfTownTravelFee = 1000,
    serviceCities = { metroManila: [], nearbyProvince: [] },
    bookingTerms,
}: Props) {
    const inspoImages = Array.isArray(inspoImagesProp) ? inspoImagesProp : [];

    const services = Array.isArray(servicesProp) ? servicesProp : [];
    const packages = Array.isArray(packagesProp) ? packagesProp : [];
    const addOns = Array.isArray(addOnsProp) ? addOnsProp : [];
    const savedAddressText = [
        savedAddress?.street_address,
        savedAddress?.barangay,
        savedAddress?.city,
        savedAddress?.province,
        savedAddress?.postal_code,
    ]
        .filter(Boolean)
        .join(', ');
    const savedCity = savedAddress?.city?.trim() ?? '';
    const savedProvince = savedAddress?.province?.trim() ?? '';
    const defaultServiceCity =
        serviceCities.metroManila.find(
            (city) => city.toLowerCase() === savedCity.toLowerCase(),
        ) ??
        serviceCities.nearbyProvince.find(
            (city) => city.toLowerCase() === savedCity.toLowerCase(),
        ) ??
        serviceCities.nearbyProvince.find(
            (city) => city.toLowerCase() === savedProvince.toLowerCase(),
        ) ??
        '';

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
    const { data, setData, post, processing, errors } = useForm<{
        service: string;
        package_id: number | null;
        add_on_quantities: Record<number, number>;
        booking_date: string;
        booking_time: string;
        service_city: string;
        venue_address: string;
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
        service_city: defaultServiceCity,
        venue_address: savedAddressText,
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
    const isNearbyProvince = serviceCities.nearbyProvince.includes(
        data.service_city,
    );
    const quoteRequired =
        basePriceType === 'quote_required' ||
        selectedAddOns.some((item) => item.pricing_type === 'quote_required') ||
        Boolean(data.service_city);
    const isRushBooking = Boolean(
        data.booking_date &&
        rushBookingCutoffDate &&
        data.booking_date < rushBookingCutoffDate,
    );
    const isEarlyCallTime = Boolean(
        data.booking_time &&
        data.booking_time >= '01:00' &&
        data.booking_time <= '05:00',
    );

    useEffect(() => {
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
            setAvailability({ state: 'checking', message: 'Checking availability…' });

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
                    if (error instanceof DOMException && error.name === 'AbortError') {
                        return;
                    }

                    setAvailability({
                        state: 'error',
                        message: 'Availability could not be checked. You can still submit; the artist will verify your request.',
                    });
                });
        }, 0);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [data.booking_date, data.booking_time, data.package_id, data.service]);

    const travelFee = !data.service_city
        ? 0
        : isNearbyProvince
          ? outOfTownTravelFee
          : metroManilaTravelFee;
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
        travelFee;

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
        post('/book', { forceFormData: true });
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
                                Category<RequiredAsterisk />
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
                                            {service.name} — ₱
                                            {Number(
                                                service.price,
                                            ).toLocaleString('en-PH')}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="Packages">
                                    {packages.map((pkg) => (
                                        <option
                                            key={pkg.id}
                                            value={`package:${pkg.id}`}
                                        >
                                            {pkg.name} —{' '}
                                            {pkg.pricing_type ===
                                            'quote_required'
                                                ? 'Price confirmed after booking'
                                                : `${pkg.pricing_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(pkg.price ?? 0).toLocaleString('en-PH')}`}
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
                                            {isNearbyProvince
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
                                htmlFor="service_city"
                                className="text-[#1a1a1a]"
                            >
                                Service city or municipality<RequiredAsterisk />
                            </Label>
                            <select
                                id="service_city"
                                value={data.service_city}
                                onChange={(event) =>
                                    setData('service_city', event.target.value)
                                }
                                className={fieldClass}
                                required
                            >
                                <option value="">
                                    Choose the service city or municipality
                                </option>
                                <optgroup
                                    label={`Metro Manila — transportation starts at ₱${metroManilaTravelFee.toLocaleString('en-PH')}`}
                                >
                                    {serviceCities.metroManila.map((city) => (
                                        <option key={city} value={city}>
                                            {city}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup
                                    label={`Nearby provinces — starts at ₱${outOfTownTravelFee.toLocaleString('en-PH')}`}
                                >
                                    {serviceCities.nearbyProvince.map(
                                        (city) => (
                                            <option key={city} value={city}>
                                                {city}
                                            </option>
                                        ),
                                    )}
                                </optgroup>
                            </select>
                            {data.service_city && (
                                <p className="text-xs text-[#4a4a4a]">
                                    Transportation fees are starting amounts.
                                    The final fee depends on the full service
                                    address and Trixie will confirm it.
                                </p>
                            )}
                            <InputError message={errors.service_city} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="venue_address"
                                className="text-[#1a1a1a]"
                            >
                                Venue address<RequiredAsterisk />
                            </Label>
                            <p className="text-xs text-[#4a4a4a]">
                                Prefilled from your profile address. Edit it
                                here and choose a different city above if this
                                appointment is at another venue.
                            </p>
                            <textarea
                                id="venue_address"
                                value={data.venue_address}
                                onChange={(event) =>
                                    setData('venue_address', event.target.value)
                                }
                                required
                                maxLength={1000}
                                rows={3}
                                placeholder="Enter the house, street, barangay, and full venue details"
                                className={`${fieldClass} resize-y`}
                            />
                            <InputError message={errors.venue_address} />
                        </div>

                        <div className="grid items-start gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="booking_date"
                                    className="flex items-center gap-1.5 text-[#1a1a1a]"
                                >
                                    <CalendarDays className="h-4 w-4 text-[#8a6a2f]" />
                                    Date<RequiredAsterisk />
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
                                    min={minimumBookingDate ?? undefined}
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
                                    Time<RequiredAsterisk />
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

                        {availability.state !== 'idle' && (
                            <p
                                role="status"
                                aria-live="polite"
                                className={`rounded-xl px-3 py-2 text-sm leading-5 ${
                                    availability.state === 'unavailable'
                                        ? 'border border-red-200 bg-red-50 text-red-800'
                                        : availability.state === 'available'
                                          ? 'border border-green-200 bg-green-50 text-green-800'
                                          : 'border border-[#E8D8A8] bg-[#FFF9E8] text-[#765C1F]'
                                }`}
                            >
                                {availability.message}
                            </p>
                        )}

                        <p className="rounded-xl bg-[#fffcf8] px-3 py-2 text-xs leading-5 text-[#4a4a4a]">
                            Regular sessions take about 1½ hours; bridal and
                            wedding bookings reserve up to 3 hours. The artist
                            usually accepts up to two bookings per day, while
                            photo and event bookings depend on availability.
                            Bookings made less than 7 days ahead are subject to
                            availability and include a ₱{rushBookingFee} rush
                            fee. Start times from 1:00 AM to 5:00 AM include a ₱
                            {earlyCallTimeFee} early call-time fee.
                        </p>

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
                            className="grid gap-3 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4"
                            aria-labelledby="booking-terms-heading"
                        >
                            <h2
                                id="booking-terms-heading"
                                className="font-semibold text-[#1a1a1a]"
                            >
                                Booking terms and conditions
                            </h2>
                            <p className="text-sm leading-6 whitespace-pre-line text-[#4a4a4a]">
                                {bookingTerms.text}
                            </p>
                            <p className="text-xs leading-5 text-[#4a4a4a]">
                                Bank transfer is also accepted. Contact the
                                artist for bank account details.
                            </p>
                            <label
                                htmlFor="terms_accepted"
                                className="flex cursor-pointer items-start gap-2 text-sm leading-5 text-[#1a1a1a]"
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
                                    and conditions.<RequiredAsterisk />
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
                                availability.state === 'checking' ||
                                availability.state === 'unavailable' ||
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
