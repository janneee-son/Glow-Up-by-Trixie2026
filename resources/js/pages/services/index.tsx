import { Head, useForm, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    ImagePlus,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import InputError from '@/components/input-error';

type Service = {
    id: number;
    name: string;
    price: number;
    description: string | null;
    is_active: boolean;
    image_url: string | null;
};

type Offering = {
    id: number;
    kind: 'package' | 'add_on';
    name: string;
    price: number | null;
    pricing_type: 'fixed' | 'starting_at' | 'quote_required';
    description: string | null;
    inclusions: string[];
    add_on_min_quantity: number;
    add_on_max_quantity: number;
    is_active: boolean;
};

type Props = {
    services: Service[];
    packages?: Offering[];
    addOns?: Offering[];
};

const inputClass =
    'w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#6b625a] focus-visible:border-[#8a6a2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30';

function usesQuantityLimits(name: string): boolean {
    return /bridesmaid|flower\s+girl/i.test(name);
}

function ServiceFields({
    service,
    onSaved,
}: {
    service?: Service;
    onSaved?: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: service?.name ?? '',
        price: service?.price.toString() ?? '',
        description: service?.description ?? '',
        image: null as File | null,
        remove_image: false,
    });

    function submit(event: React.FormEvent) {
        event.preventDefault();
        const options = {
            forceFormData: true,
            onSuccess: () => {
                if (!service) {
                    reset();
                    onSaved?.();
                }
            },
        };

        if (service) {
            patch(`/artist/services/${service.id}`, options);
        } else {
            post('/artist/services', options);
        }
    }

    return (
        <form
            onSubmit={submit}
            className="grid gap-4 rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-lg shadow-[#c9a66b]/10 sm:p-6"
        >
            <div className="flex items-center gap-2 font-semibold text-[#1a1a1a]">
                {service ? (
                    <Pencil className="h-4 w-4 text-[#8a6a2f]" />
                ) : (
                    <Plus className="h-4 w-4 text-[#8a6a2f]" />
                )}
                {service ? 'Edit service' : 'Service details'}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                    Service name
                    <input
                        className={inputClass}
                        maxLength={100}
                        value={data.name}
                        onChange={(event) =>
                            setData('name', event.target.value)
                        }
                        required
                    />
                    <InputError message={errors.name} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                    Price (₱)
                    <input
                        className={inputClass}
                        type="number"
                        min="0"
                        max="1000000"
                        step="0.01"
                        value={data.price}
                        onChange={(event) =>
                            setData('price', event.target.value)
                        }
                        required
                    />
                    <InputError message={errors.price} />
                </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                Description (optional)
                <textarea
                    className={inputClass}
                    maxLength={300}
                    rows={3}
                    value={data.description}
                    onChange={(event) =>
                        setData('description', event.target.value)
                    }
                />
                <InputError message={errors.description} />
            </label>
            <div className="grid gap-2 text-xs font-semibold text-[#4a4a4a]">
                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[#d7c0a2] bg-white px-4 py-2 text-[#8a6a2f] transition hover:bg-[#f4e9e5]">
                    <ImagePlus className="h-4 w-4" />{' '}
                    {data.image
                        ? data.image.name
                        : service?.image_url
                          ? 'Replace service photo'
                          : 'Add a service photo'}
                    <input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                            setData('image', event.target.files?.[0] ?? null);
                            setData('remove_image', false);
                        }}
                    />
                </label>
                {service?.image_url && (
                    <label className="flex items-center gap-2 font-normal">
                        <input
                            type="checkbox"
                            checked={data.remove_image}
                            onChange={(event) =>
                                setData('remove_image', event.target.checked)
                            }
                        />{' '}
                        Remove current photo
                    </label>
                )}
                <InputError message={errors.image} />
            </div>
            <button
                disabled={processing}
                className="w-fit rounded-full bg-[#8a6a2f] px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-[#8a6a2f]/25 transition hover:bg-[#8a6a2f] disabled:opacity-50"
            >
                {processing
                    ? 'Saving…'
                    : service
                      ? 'Save changes'
                      : 'Add service'}
            </button>
        </form>
    );
}

function ServiceCard({ service }: { service: Service }) {
    const [editing, setEditing] = useState(false);
    const { patch, delete: destroy, processing } = useForm();

    return (
        <article className="overflow-hidden rounded-3xl border border-[#e8d7cf] bg-white shadow-sm shadow-[#c9a66b]/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#c9a66b]/15">
            <div className="flex gap-4 p-5 sm:p-6">
                {service.image_url ? (
                    <img
                        src={service.image_url}
                        alt=""
                        className="h-20 w-20 rounded-2xl object-cover ring-2 ring-[#f4e9e5]"
                    />
                ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#f4e9e5]">
                        <BriefcaseBusiness className="h-6 w-6 text-[#8a6a2f]" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-serif text-xl font-bold text-[#1a1a1a]">
                            {service.name}
                        </h2>
                        <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${service.is_active ? 'bg-[#E5F2E7] text-[#4B7851]' : 'bg-[#faf7f4] text-[#4a4a4a]'}`}
                        >
                            {service.is_active ? 'Active' : 'Hidden'}
                        </span>
                    </div>
                    <p className="mt-1 font-semibold text-[#8a6a2f]">
                        ₱
                        {service.price.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                        })}
                    </p>
                    {service.description && (
                        <p className="mt-2 text-sm text-[#4a4a4a]">
                            {service.description}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[#F0E5EA] bg-[#FEFBFC] p-4">
                <button
                    type="button"
                    onClick={() =>
                        patch(`/artist/services/${service.id}/toggle`)
                    }
                    disabled={processing}
                    className="rounded-full border border-[#d7c0a2] px-4 py-1.5 text-xs font-semibold text-[#8a6a2f] transition hover:bg-[#f4e9e5] disabled:opacity-50"
                >
                    {service.is_active ? 'Hide from clients' : 'Make active'}
                </button>
                <button
                    type="button"
                    onClick={() => setEditing((value) => !value)}
                    className="rounded-full border border-[#d7c0a2] px-4 py-1.5 text-xs font-semibold text-[#8a6a2f] transition hover:bg-[#f4e9e5]"
                >
                    {editing ? 'Close editor' : 'Edit'}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        if (window.confirm(`Delete ${service.name}?`)) {
                            destroy(`/artist/services/${service.id}`);
                        }
                    }}
                    disabled={processing}
                    className="flex items-center gap-1 rounded-full border border-[#D9A5A5] px-4 py-1.5 text-xs font-semibold text-[#A13F3F] hover:bg-[#FDEDED]"
                >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
            </div>
            {editing && (
                <div className="p-4">
                    <ServiceFields service={service} />
                </div>
            )}
        </article>
    );
}

function OfferingForm({
    kind,
    offering,
    onSaved,
}: {
    kind: 'package' | 'add_on';
    offering?: Offering;
    onSaved?: () => void;
}) {
    const { data, setData, post, patch, processing, errors, reset, transform } =
        useForm({
            kind,
            name: offering?.name ?? '',
            price: offering?.price?.toString() ?? '',
            pricing_type: offering?.pricing_type ?? 'fixed',
            description: offering?.description ?? '',
            inclusions: offering?.inclusions ?? [],
            add_on_min_quantity: offering?.add_on_min_quantity ?? 1,
            add_on_max_quantity: offering?.add_on_max_quantity ?? 1,
        });
    const quantityLimitsApply =
        kind === 'add_on' && usesQuantityLimits(data.name);

    function submit(event: React.FormEvent) {
        event.preventDefault();
        transform((form) => ({
            ...form,
            price: form.pricing_type === 'quote_required' ? '' : form.price,
            inclusions:
                kind === 'package'
                    ? form.inclusions.map((line) => line.trim()).filter(Boolean)
                    : [],
        }));

        if (offering) {
            patch(`/artist/offerings/${offering.id}`);
        } else {
            post('/artist/offerings', {
                onSuccess: () => {
                    reset();
                    onSaved?.();
                },
            });
        }
    }

    return (
        <form
            onSubmit={submit}
            className="grid gap-4 rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm sm:p-6"
        >
            <h3 className="font-semibold text-[#1a1a1a]">
                {offering ? 'Edit' : 'Add'}{' '}
                {kind === 'package' ? 'package' : 'add-on'}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                    Name
                    <input
                        className={inputClass}
                        maxLength={120}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                    {kind === 'add_on'
                        ? 'Price per person/item (₱)'
                        : 'Price (₱)'}
                    <input
                        className={inputClass}
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.price}
                        onChange={(e) => setData('price', e.target.value)}
                        required={data.pricing_type !== 'quote_required'}
                        disabled={data.pricing_type === 'quote_required'}
                        placeholder={
                            data.pricing_type === 'quote_required'
                                ? 'Artist will provide a quote'
                                : 'e.g. 3500'
                        }
                    />
                    <InputError message={errors.price} />
                </label>
            </div>
            <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                Price display
                <select
                    className={inputClass}
                    value={data.pricing_type}
                    onChange={(e) =>
                        setData(
                            'pricing_type',
                            e.target.value as typeof data.pricing_type,
                        )
                    }
                >
                    <option value="fixed">Fixed price</option>
                    <option value="starting_at">Starting at</option>
                    <option value="quote_required">
                        Price confirmed after booking
                    </option>
                </select>
                <InputError message={errors.pricing_type} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                Description
                <textarea
                    className={inputClass}
                    maxLength={500}
                    rows={2}
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                <InputError message={errors.description} />
            </label>
            {kind === 'package' && (
                <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                    Package inclusions (one per line)
                    <textarea
                        className={inputClass}
                        rows={4}
                        value={data.inclusions.join('\n')}
                        onChange={(e) =>
                            setData('inclusions', e.target.value.split('\n'))
                        }
                        placeholder="Makeup and hair look\nSkin preparation\nPremium lashes"
                    />
                    <InputError message={errors.inclusions} />
                </label>
            )}
            {quantityLimitsApply && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                        Minimum quantity
                        <input
                            className={inputClass}
                            type="number"
                            min="1"
                            max="50"
                            step="1"
                            value={data.add_on_min_quantity}
                            onChange={(e) =>
                                setData(
                                    'add_on_min_quantity',
                                    Number(e.target.value),
                                )
                            }
                            required
                        />
                        <InputError message={errors.add_on_min_quantity} />
                    </label>
                    <label className="grid gap-1.5 text-xs font-semibold text-[#4a4a4a]">
                        Maximum quantity
                        <input
                            className={inputClass}
                            type="number"
                            min={data.add_on_min_quantity}
                            max="50"
                            step="1"
                            value={data.add_on_max_quantity}
                            onChange={(e) =>
                                setData(
                                    'add_on_max_quantity',
                                    Number(e.target.value),
                                )
                            }
                            required
                        />
                        <InputError message={errors.add_on_max_quantity} />
                    </label>
                </div>
            )}
            <button
                disabled={processing}
                className="w-fit rounded-full bg-[#8a6a2f] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
                {processing
                    ? 'Saving…'
                    : offering
                      ? 'Save changes'
                      : `Add ${kind === 'package' ? 'package' : 'add-on'}`}
            </button>
        </form>
    );
}

function OfferingCard({ offering }: { offering: Offering }) {
    const { patch, delete: destroy, processing } = useForm();
    const [editing, setEditing] = useState(false);
    const priceLabel =
        offering.pricing_type === 'quote_required'
            ? 'Price confirmed after booking'
            : `${offering.pricing_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(offering.price ?? 0).toLocaleString('en-PH')}`;

    return (
        <article className="rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-serif text-xl font-bold text-[#1a1a1a]">
                        {offering.name}
                    </h3>
                    <p className="mt-1 font-semibold text-[#8a6a2f]">
                        {priceLabel}
                        {offering.kind === 'add_on' ? ' each' : ''}
                    </p>
                    {offering.kind === 'add_on' &&
                        usesQuantityLimits(offering.name) && (
                            <p className="mt-1 text-xs text-[#4a4a4a]">
                                Client quantity: {offering.add_on_min_quantity}–
                                {offering.add_on_max_quantity}
                            </p>
                        )}
                    {offering.description && (
                        <p className="mt-2 text-sm text-[#4a4a4a]">
                            {offering.description}
                        </p>
                    )}
                    {offering.inclusions?.length > 0 && (
                        <ul className="mt-3 list-inside list-disc text-sm text-[#4a4a4a]">
                            {offering.inclusions.map((item, index) => (
                                <li key={`${index}-${item}`}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>
                <span className="rounded-full bg-[#faf7f4] px-3 py-1 text-xs font-semibold">
                    {offering.is_active ? 'Active' : 'Hidden'}
                </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F0E5EA] pt-4">
                <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                        patch(`/artist/offerings/${offering.id}/toggle`)
                    }
                    className="rounded-full border border-[#d7c0a2] px-4 py-1.5 text-xs font-semibold text-[#8a6a2f]"
                >
                    {offering.is_active ? 'Hide from clients' : 'Make active'}
                </button>
                <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="rounded-full border border-[#d7c0a2] px-4 py-1.5 text-xs font-semibold text-[#8a6a2f]"
                >
                    {editing ? 'Close editor' : 'Edit'}
                </button>
                <button
                    type="button"
                    disabled={processing}
                    onClick={() =>
                        window.confirm(`Delete ${offering.name}?`) &&
                        destroy(`/artist/offerings/${offering.id}`)
                    }
                    className="rounded-full border border-[#D9A5A5] px-4 py-1.5 text-xs font-semibold text-[#A13F3F]"
                >
                    Delete
                </button>
            </div>
            {editing && (
                <div className="mt-4">
                    <OfferingForm kind={offering.kind} offering={offering} />
                </div>
            )}
        </article>
    );
}

export default function ServicesIndex({
    services,
    packages = [],
    addOns = [],
}: Props) {
    const [serviceFormOpen, setServiceFormOpen] = useState(false);
    const [packageFormOpen, setPackageFormOpen] = useState(false);
    const [addOnFormOpen, setAddOnFormOpen] = useState(false);
    const { auth } = usePage<{
        auth?: {
            user?: { name?: string; role?: 'client' | 'artist' | 'admin' };
        };
    }>().props;

    return (
        <>
            <Head title="Manage Services" />
            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="services"
                />
                <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative overflow-hidden rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#e8d7cf]/50 blur-2xl" />
                        <div className="relative">
                            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                Artist studio
                            </p>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                                Manage services
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                                Active services appear on your public page and
                                can be selected when clients book.
                            </p>
                        </div>
                    </section>
                    <button
                        type="button"
                        aria-expanded={serviceFormOpen}
                        onClick={() => setServiceFormOpen((open) => !open)}
                        className="inline-flex w-fit items-center gap-2 rounded-full bg-[#8a6a2f] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#735829]"
                    >
                        <Plus className="h-4 w-4" />
                        {serviceFormOpen
                            ? 'Close service form'
                            : 'Add a service'}
                    </button>
                    {serviceFormOpen && (
                        <ServiceFields
                            onSaved={() => setServiceFormOpen(false)}
                        />
                    )}
                    <section className="grid gap-4">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                Your menu
                            </p>
                            <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">
                                Services ({services.length})
                            </h2>
                        </div>
                        {services.map((service) => (
                            <ServiceCard key={service.id} service={service} />
                        ))}
                        {services.length === 0 && (
                            <p className="rounded-3xl border border-dashed border-[#d7c0a2] bg-white/80 p-6 text-sm text-[#4a4a4a] shadow-sm">
                                You haven&apos;t added any services yet.
                            </p>
                        )}
                    </section>
                    <section className="grid gap-4">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                Artist menu
                            </p>
                            <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">
                                Packages ({packages.length})
                            </h2>
                            <p className="mt-1 text-sm text-[#4a4a4a]">
                                Use “Starting at” when the final price depends
                                on the requested looks or retouching.
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-expanded={packageFormOpen}
                            onClick={() => setPackageFormOpen((open) => !open)}
                            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#8a6a2f] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#735829]"
                        >
                            <Plus className="h-4 w-4" />
                            {packageFormOpen
                                ? 'Close package form'
                                : 'Add a package'}
                        </button>
                        {packageFormOpen && (
                            <OfferingForm
                                kind="package"
                                onSaved={() => setPackageFormOpen(false)}
                            />
                        )}
                        {packages.map((offering) => (
                            <OfferingCard
                                key={offering.id}
                                offering={offering}
                            />
                        ))}
                    </section>
                    <section className="grid gap-4">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                Optional extras
                            </p>
                            <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">
                                Add-ons ({addOns.length})
                            </h2>
                            <p className="mt-1 text-sm text-[#4a4a4a]">
                                Clients can add these extras to a service or
                                package when booking.
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-expanded={addOnFormOpen}
                            onClick={() => setAddOnFormOpen((open) => !open)}
                            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#8a6a2f] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#735829]"
                        >
                            <Plus className="h-4 w-4" />
                            {addOnFormOpen
                                ? 'Close add-on form'
                                : 'Add an add-on'}
                        </button>
                        {addOnFormOpen && (
                            <OfferingForm
                                kind="add_on"
                                onSaved={() => setAddOnFormOpen(false)}
                            />
                        )}
                        {addOns.map((offering) => (
                            <OfferingCard
                                key={offering.id}
                                offering={offering}
                            />
                        ))}
                    </section>
                </main>
            </div>
        </>
    );
}
