import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Check,
    CalendarDays,
    Clock,
    ImageIcon,
    MessageSquare,
    Phone,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import BookingItemizedPricing from '@/components/booking-itemized-pricing';
import BookingActivityTimeline from '@/components/booking-activity-timeline';
import DashboardHeader from '@/components/dashboard-header';
import RequiredAsterisk from '@/components/required-asterisk';

type Booking = {
    id: number;
    created_at: string;
    updated_at: string;
    service: string;
    base_price?: number | string | null;
    base_price_type?: 'fixed' | 'starting_at' | 'quote_required';
    estimated_total?: number | string | null;
    transportation_fee_pending?: boolean;
    final_makeup_price?: number | string | null;
    quote_reason?: string | null;
    quote_pending?: boolean;
    quote_accepted_at?: string | null;
    terms_accepted_at?: string | null;
    terms_version?: string | null;
    deposit_status?: 'not_due' | 'due' | 'submitted' | 'received';
    deposit_amount?: number | string | null;
    deposit_method?: 'gcash' | 'bank_transfer' | 'cash' | null;
    deposit_reference?: string | null;
    deposit_proof_url?: string | null;
    deposit_submitted_at?: string | null;
    deposit_received_at?: string | null;
    confirmed_at?: string | null;
    completed_at?: string | null;
    cancelled_at?: string | null;
    total_paid_amount?: number | string | null;
    remaining_balance?: number | string | null;
    balance_payments?: BalancePayment[];
    selected_add_ons?:
        | {
              id: number | null;
              name: string;
              price: number | string | null;
              quantity: number;
              line_total: number | string | null;
              pricing_type: string;
              is_system_fee?: boolean;
          }[]
        | null;
    requires_quote?: boolean;
    booking_date: string;
    booking_time: string;
    location_type?: string | null;
    service_area_level?: 'covered' | 'on_request';
    venue_address?: string | null;
    venue_latitude?: number | string | null;
    venue_longitude?: number | string | null;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    notes: string | null;
    artist_message: string | null;
    inspo_url: string | null;
    client: {
        id: number;
        name: string;
        phone: string | null;
    };
};

type BalancePayment = {
    id: number;
    amount: number | string;
    method: 'gcash' | 'bank_transfer' | 'cash' | 'other';
    reference: string | null;
    paid_at: string;
};

type Props = {
    bookings: Booking[];
    reviews: {
        id: number;
        rating: number;
        comment: string;
        is_approved: boolean;
        client: { name: string };
        booking: { service: string; booking_date: string };
    }[];
};

const STATUS_STYLES: Record<Booking['status'], string> = {
    pending: 'bg-[#f4e9e5] text-[#8a6a2f]',
    confirmed: 'bg-[#DFF5E1] text-[#2E7D46]',
    completed: 'bg-[#f4e9e5] text-[#8a6a2f]',
    cancelled: 'bg-[#F5E0E0] text-[#A13F3F]',
};

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatTime(timeStr: string) {
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(Number(h), Number(m));

    return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function dateInputToday() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

    return today.toISOString().slice(0, 10);
}

/** Splits saved notes into the "Occasion: X" first line and the client's own text. */
function splitNotes(notes: string | null) {
    if (!notes) {
        return { occasion: null as string | null, text: '' };
    }

    const m = notes.match(/^Occasion: (.+?)(?:\n|$)/);

    return m
        ? { occasion: m[1], text: notes.slice(m[0].length).trim() }
        : { occasion: null, text: notes };
}

function transportationFeeForBooking(booking: Booking): string {
    const feeItem = booking.selected_add_ons?.find(
        (item) => item.is_system_fee && /transportation/i.test(item.name),
    );

    return String(feeItem?.line_total ?? feeItem?.price ?? 0);
}

function isPastBooking(booking: Booking) {
    const dt = new Date(`${booking.booking_date}T${booking.booking_time}`);

    return (
        dt.getTime() < Date.now() ||
        booking.status === 'completed' ||
        booking.status === 'cancelled'
    );
}

export default function ArtistDashboard({ bookings, reviews = [] }: Props) {
    const { auth } = usePage<{
        auth?: {
            user?: { name?: string; role?: 'client' | 'artist' | 'admin' };
        };
    }>().props;
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [busyId, setBusyId] = useState<number | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [depositConfirmation, setDepositConfirmation] = useState<Booking | null>(null);
    const [messages, setMessages] = useState<Record<number, string>>({});
    const [messageOpen, setMessageOpen] = useState<Record<number, boolean>>({});
    const [makeupPrices, setMakeupPrices] = useState<Record<number, string>>(
        {},
    );
    const [transportationFees, setTransportationFees] = useState<
        Record<number, string>
    >({});
    const [quoteReasons, setQuoteReasons] = useState<Record<number, string>>(
        {},
    );
    const [quoteErrors, setQuoteErrors] = useState<Record<number, string>>({});
    const [balanceAmounts, setBalanceAmounts] = useState<Record<number, string>>({});
    const [balanceMethods, setBalanceMethods] = useState<Record<number, string>>({});
    const [balanceReferences, setBalanceReferences] = useState<Record<number, string>>({});
    const [balanceDates, setBalanceDates] = useState<Record<number, string>>({});
    const [balanceErrors, setBalanceErrors] = useState<Record<number, string>>({});
    const [reviewBusyId, setReviewBusyId] = useState<number | null>(null);
    const pending = useMemo(
        () => bookings.filter((b) => b.status === 'pending'),
        [bookings],
    );
    const { upcoming, past } = useMemo(() => {
        const upcoming: Booking[] = [];
        const past: Booking[] = [];

        for (const b of bookings) {
            if (b.status === 'pending') {
                continue;
            }

            (isPastBooking(b) ? past : upcoming).push(b);
        }

        return { upcoming, past };
    }, [bookings]);

    const visible = tab === 'upcoming' ? upcoming : past;

    function act(id: number, action: 'accept' | 'decline' | 'complete') {
        setBusyId(id);
        router.patch(
            `/book/${id}/${action}`,
            action === 'complete'
                ? {}
                : { artist_message: messages[id]?.trim() || null },
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusyId(null);
                    setMessages((prev) => {
                        const next = { ...prev };
                        delete next[id];

                        return next;
                    });
                },
            },
        );
    }

    function sendQuote(booking: Booking) {
        const makeupPrice =
            makeupPrices[booking.id] ??
            String(booking.final_makeup_price ?? booking.base_price ?? '');
        const fee =
            transportationFees[booking.id] ??
            transportationFeeForBooking(booking);
        const reason = quoteReasons[booking.id] ?? booking.quote_reason ?? '';

        setBusyId(booking.id);
        setQuoteErrors((current) => ({ ...current, [booking.id]: '' }));
        router.patch(
            `/book/${booking.id}/quote`,
            {
                final_makeup_price: makeupPrice,
                transportation_fee: fee,
                quote_reason: reason,
            },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setQuoteErrors((current) => ({
                        ...current,
                        [booking.id]: String(
                            errors.quote_reason ??
                                errors.final_makeup_price ??
                                errors.transportation_fee ??
                                'Could not send the final quote.',
                        ),
                    })),
                onFinish: () => {
                    setBusyId(null);
                },
            },
        );
    }

    function markDepositReceived(booking: Booking) {
        setBusyId(booking.id);
        router.patch(
            `/book/${booking.id}/deposit/received`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusyId(null);
                    setDepositConfirmation(null);
                },
            },
        );
    }

    function recordBalancePayment(booking: Booking) {
        setBusyId(booking.id);
        setBalanceErrors((current) => ({ ...current, [booking.id]: '' }));
        router.post(
            `/book/${booking.id}/balance-payments`,
            {
                amount: balanceAmounts[booking.id] ?? '',
                method: balanceMethods[booking.id] ?? 'cash',
                reference: balanceReferences[booking.id] ?? '',
                paid_at: balanceDates[booking.id] ?? dateInputToday(),
            },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setBalanceErrors((current) => ({
                        ...current,
                        [booking.id]: String(errors.amount ?? errors.method ?? errors.paid_at ?? 'Could not record the payment.'),
                    })),
                onSuccess: () => {
                    setBalanceAmounts((current) => ({ ...current, [booking.id]: '' }));
                    setBalanceReferences((current) => ({ ...current, [booking.id]: '' }));
                },
                onFinish: () => setBusyId(null),
            },
        );
    }

    function setReviewApproval(id: number, is_approved: boolean) {
        setReviewBusyId(id);
        router.patch(
            `/artist/reviews/${id}`,
            { is_approved },
            {
                preserveScroll: true,
                onFinish: () => setReviewBusyId(null),
            },
        );
    }

    useEffect(() => {
        if (!viewingUrl) {
            return;
        }

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setViewingUrl(null);
            }
        }
        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewingUrl]);

    return (
        <>
            <Head title="Artist Dashboard" />

            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="dashboard"
                />

                <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-[#e8d7cf]/50 blur-2xl" />
                        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                            <div>
                                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8d7cf] bg-white/80 px-3 py-1.5 text-sm font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                    <Sparkles className="h-3.5 w-3.5" /> Artist
                                    studio
                                </span>
                                <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                                    Welcome back,{' '}
                                    {auth?.user?.name?.split(' ')[0] ?? 'there'}
                                    !
                                </h1>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                                    Your schedule, client requests, and
                                    completed looks—all in one place.
                                </p>
                            </div>
                            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white bg-white/70 text-[#8a6a2f] shadow-sm sm:flex">
                                <Sparkles
                                    className="h-9 w-9"
                                    strokeWidth={1.4}
                                />
                            </div>
                        </div>
                    </section>

                    {/* pending requests */}
                    {pending.length > 0 && (
                        <div className="mb-9">
                            <div className="mb-3 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                        Your inbox
                                    </p>
                                    <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">
                                        Pending requests
                                    </h2>
                                </div>
                                <span className="rounded-full bg-[#f4e9e5] px-3 py-1 text-sm font-semibold text-[#8a6a2f]">
                                    {pending.length} waiting
                                </span>
                            </div>
                            <div className="grid gap-4">
                                {pending.map((booking) => (
                                    <div
                                        key={booking.id}
                                        id={`booking-${booking.id}`}
                                        className="rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-md shadow-[#c9a66b]/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#c9a66b]/15 sm:p-6"
                                    >
                                        <BookingHeader
                                            booking={booking}
                                            onViewInspo={setViewingUrl}
                                        >

                                        {booking.deposit_status !== 'submitted' && booking.deposit_status !== 'received' && (
                                        <div className="mt-4 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                            <h3 className="text-sm font-semibold text-[#1a1a1a]">
                                                {booking.quote_accepted_at ? 'Revise the accepted quote' : booking.quote_pending ? 'Update the itemized quote' : booking.service_area_level === 'on_request' ? 'Review this on-request area' : 'Prepare the final quote'}
                                            </h3>
                                            <p className="mt-1 text-sm leading-5 text-[#4a4a4a]">
                                                {booking.quote_accepted_at
                                                    ? 'The client accepted this quote. Sending a revision will ask them to approve the new itemized total before the deposit can be submitted.'
                                                    : booking.quote_pending
                                                      ? 'This quote is waiting for the client. Adjust the makeup or transportation price if needed, then send the updated itemization.'
                                                      : booking.service_area_level === 'on_request'
                                                    ? 'Decide whether you can serve this location. Send an itemized travel-fee quote to approve the request, or decline if the area is not workable.'
                                                    : 'Review the inspiration and address, then send one itemized makeup and transportation price for the client to approve.'}
                                            </p>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label
                                                        htmlFor={`makeup-price-${booking.id}`}
                                                        className="mb-1 block text-sm font-medium text-[#4a4a4a]"
                                                    >
                                                        Final makeup price (₱)<RequiredAsterisk />
                                                    </label>
                                                    <input
                                                        id={`makeup-price-${booking.id}`}
                                                        type="number"
                                                        min={0}
                                                        max={1000000}
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={
                                                            makeupPrices[
                                                                booking.id
                                                            ] ??
                                                            String(
                                                                booking.final_makeup_price ??
                                                                    booking.base_price ??
                                                                    '',
                                                            )
                                                        }
                                                        onChange={(event) =>
                                                            setMakeupPrices(
                                                                (current) => ({
                                                                    ...current,
                                                                    [booking.id]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className="w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30 focus-visible:outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label
                                                        htmlFor={`travel-fee-${booking.id}`}
                                                        className="mb-1 block text-sm font-medium text-[#4a4a4a]"
                                                    >
                                                        Transportation fee (₱)<RequiredAsterisk />
                                                    </label>
                                                    <input
                                                        id={`travel-fee-${booking.id}`}
                                                        type="number"
                                                        min={0}
                                                        max={1000000}
                                                        step={1}
                                                        inputMode="numeric"
                                                        value={
                                                            transportationFees[
                                                                booking.id
                                                            ] ??
                                                            transportationFeeForBooking(
                                                                booking,
                                                            )
                                                        }
                                                        onChange={(event) =>
                                                            setTransportationFees(
                                                                (current) => ({
                                                                    ...current,
                                                                    [booking.id]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className="w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30 focus-visible:outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label
                                                    htmlFor={`quote-reason-${booking.id}`}
                                                    className="mb-1 block text-sm font-medium text-[#4a4a4a]"
                                                >
                                                    Reason for a price above the
                                                    starting price
                                                </label>
                                                <textarea
                                                    id={`quote-reason-${booking.id}`}
                                                    rows={2}
                                                    maxLength={500}
                                                    value={
                                                        quoteReasons[
                                                            booking.id
                                                        ] ??
                                                        booking.quote_reason ??
                                                        ''
                                                    }
                                                    onChange={(event) =>
                                                        setQuoteReasons(
                                                            (current) => ({
                                                                ...current,
                                                                [booking.id]:
                                                                    event.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    placeholder="For example, the requested look needs extra styling or preparation."
                                                    className="w-full resize-y rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#4a4a4a]/60 focus-visible:border-[#8a6a2f] focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30 focus-visible:outline-none"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                disabled={
                                                    busyId === booking.id ||
                                                    makeupPrices[booking.id] ===
                                                        '' ||
                                                    transportationFees[
                                                        booking.id
                                                    ] === '' ||
                                                    Number(
                                                        makeupPrices[
                                                            booking.id
                                                        ] ??
                                                            booking.final_makeup_price ??
                                                            booking.base_price ??
                                                            0,
                                                    ) < 0 ||
                                                    Number(
                                                        transportationFees[
                                                            booking.id
                                                        ] ?? 0,
                                                    ) < 0
                                                }
                                                onClick={() =>
                                                    sendQuote(booking)
                                                }
                                                className="mt-3 rounded-full bg-[#8a6a2f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f5325] disabled:opacity-50"
                                            >
                                                {busyId === booking.id
                                                    ? 'Sending…'
                                                    : booking.quote_accepted_at
                                                      ? 'Send revised quote'
                                                      : booking.quote_pending
                                                        ? 'Update itemized quote'
                                                        : 'Send itemized quote'}
                                            </button>
                                            {quoteErrors[booking.id] && (
                                                <p
                                                    role="alert"
                                                    className="mt-2 text-sm text-[#A13F3F]"
                                                >
                                                    {quoteErrors[booking.id]}
                                                </p>
                                            )}
                                        </div>
                                        )}
                                        </BookingHeader>

                                        <BookingActivityTimeline booking={booking} />

                                        {(booking.quote_pending ||
                                            booking.transportation_fee_pending) && (
                                            <p className="mt-3 rounded-xl border border-[#c9a66b] bg-[#fffcf8] px-4 py-3 text-sm font-medium text-[#8a6a2f]">
                                                The itemized quote is with the
                                                client. They must approve it
                                                before the deposit step.
                                            </p>
                                        )}
                                        {booking.quote_accepted_at &&
                                            booking.deposit_status ===
                                                'due' && (
                                                <p className="mt-3 rounded-xl border border-[#c9a66b] bg-[#fffcf8] px-4 py-3 text-sm font-medium text-[#8a6a2f]">
                                                    Quote accepted. Waiting for
                                                    the 50% deposit of ₱
                                                    {(
                                                        Number(
                                                            booking.estimated_total ??
                                                                0,
                                                        ) / 2
                                                    ).toLocaleString('en-PH', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                    .
                                                </p>
                                            )}
                                        {booking.deposit_status ===
                                            'submitted' && (
                                            <div className="mt-3 rounded-xl border border-[#c9a66b] bg-[#fffcf8] p-4 text-sm">
                                                <p className="font-semibold text-[#1a1a1a]">
                                                    Client marked the deposit as
                                                    sent · ₱
                                                    {(
                                                        Number(
                                                            booking.estimated_total ??
                                                                0,
                                                        ) / 2
                                                    ).toLocaleString('en-PH', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </p>
                                                <p className="mt-1 text-[#4a4a4a]">
                                                    Payment method:{' '}
                                                    {booking.deposit_method?.replace(
                                                        '_',
                                                        ' ',
                                                    ) ?? 'Not specified'}
                                                    {booking.deposit_reference
                                                        ? ` · Reference: ${booking.deposit_reference}`
                                                        : ''}
                                                </p>
                                                <p className="mt-2 text-[#6a5542]">
                                                    Verify the payment to confirm the booking at the client-accepted total. Prices are locked once the deposit is reported as sent.
                                                </p>
                                                {booking.deposit_proof_url && (
                                                    <img
                                                        src={
                                                            booking.deposit_proof_url
                                                        }
                                                        alt="Client's uploaded deposit payment proof"
                                                        className="mt-3 max-h-72 rounded-xl border border-[#e8d7cf] object-contain"
                                                    />
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={
                                                        busyId === booking.id
                                                    }
                                                    onClick={() => setDepositConfirmation(booking)}
                                                    className="mt-3 rounded-full bg-[#2E7D46] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50"
                                                >
                                                    {busyId === booking.id
                                                        ? 'Saving…'
                                                        : 'Verify deposit & confirm booking'}
                                                </button>
                                            </div>
                                        )}
                                        {booking.deposit_status ===
                                            'received' && (
                                            <div className="mt-3 rounded-xl border border-[#b7d5bb] bg-[#f1f7f1] px-4 py-3 text-sm text-[#426948]">
                                                <p className="font-medium">
                                                    50% deposit received: ₱
                                                    {Number(
                                                        booking.deposit_amount ??
                                                            Number(booking.estimated_total ?? 0) / 2,
                                                    ).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.
                                                </p>
                                                <p className="mt-2 font-medium">
                                                    Remaining balance: ₱{Number(booking.remaining_balance ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    {Number(booking.remaining_balance ?? 0) > 0 ? ' due.' : ' · Paid in full.'}
                                                </p>
                                                {!!booking.balance_payments?.length && (
                                                    <div className="mt-3 border-t border-[#b7d5bb] pt-3">
                                                        <p className="font-semibold">Recorded balance payments</p>
                                                        <ul className="mt-1 grid gap-1">
                                                            {booking.balance_payments.map((payment) => (
                                                                <li key={payment.id}>
                                                                    ₱{Number(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })} · {payment.method.replace('_', ' ')} · {formatDate(payment.paid_at)}
                                                                    {payment.reference ? ` · Ref: ${payment.reference}` : ''}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {booking.deposit_status === 'received' &&
                                            ['confirmed', 'completed'].includes(booking.status) &&
                                            Number(booking.remaining_balance ?? 0) > 0 && (
                                                <div className="mt-3 rounded-xl border border-[#e8d7cf] bg-white p-4">
                                                    <h3 className="font-semibold text-[#1a1a1a]">Record a balance payment</h3>
                                                    <p className="mt-1 text-sm text-[#6b625e]">
                                                        Up to ₱{Number(booking.remaining_balance).toLocaleString('en-PH', { minimumFractionDigits: 2 })} remaining.
                                                    </p>
                                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                        <label className="grid gap-1 text-sm font-medium text-[#4a4a4a]">
                                                            Amount (₱)<RequiredAsterisk />
                                                            <input type="number" min="0.01" max={Number(booking.remaining_balance)} step="0.01" value={balanceAmounts[booking.id] ?? ''} onChange={(event) => setBalanceAmounts((current) => ({ ...current, [booking.id]: event.target.value }))} className="rounded-lg border border-[#d8c8c1] px-3 py-2 text-sm" />
                                                        </label>
                                                        <label className="grid gap-1 text-sm font-medium text-[#4a4a4a]">
                                                            Payment method<RequiredAsterisk />
                                                            <select value={balanceMethods[booking.id] ?? 'cash'} onChange={(event) => setBalanceMethods((current) => ({ ...current, [booking.id]: event.target.value }))} className="rounded-lg border border-[#d8c8c1] px-3 py-2 text-sm">
                                                                <option value="cash">Cash</option>
                                                                <option value="gcash">GCash</option>
                                                                <option value="bank_transfer">Bank transfer</option>
                                                                <option value="other">Other</option>
                                                            </select>
                                                        </label>
                                                        <label className="grid gap-1 text-sm font-medium text-[#4a4a4a]">
                                                            Date paid<RequiredAsterisk />
                                                            <input type="date" max={dateInputToday()} value={balanceDates[booking.id] ?? dateInputToday()} onChange={(event) => setBalanceDates((current) => ({ ...current, [booking.id]: event.target.value }))} className="rounded-lg border border-[#d8c8c1] px-3 py-2 text-sm" />
                                                        </label>
                                                        <label className="grid gap-1 text-sm font-medium text-[#4a4a4a]">
                                                            Reference <span className="font-normal">(optional)</span>
                                                            <input type="text" maxLength={120} value={balanceReferences[booking.id] ?? ''} onChange={(event) => setBalanceReferences((current) => ({ ...current, [booking.id]: event.target.value }))} className="rounded-lg border border-[#d8c8c1] px-3 py-2 text-sm" />
                                                        </label>
                                                    </div>
                                                    {balanceErrors[booking.id] && <p role="alert" className="mt-2 text-sm text-red-700">{balanceErrors[booking.id]}</p>}
                                                    <button type="button" disabled={busyId === booking.id || !balanceAmounts[booking.id]} onClick={() => recordBalancePayment(booking)} className="mt-3 rounded-full bg-[#2E7D46] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50">
                                                        {busyId === booking.id ? 'Saving…' : 'Record payment and notify client'}
                                                    </button>
                                                </div>
                                            )}

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                aria-label={messageOpen[booking.id] ? 'Hide message to client' : 'Write a message to client'}
                                                aria-expanded={Boolean(messageOpen[booking.id])}
                                                title="Message client"
                                                onClick={() => setMessageOpen((current) => ({ ...current, [booking.id]: !current[booking.id] }))}
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/40 focus-visible:outline-none ${messageOpen[booking.id] || messages[booking.id] ? 'border-[#8a6a2f] bg-[#f4e9e5] text-[#704f1e]' : 'border-[#d7c0a2] bg-white text-[#704f1e] hover:bg-[#fffcf8]'}`}
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </button>
                                            {booking.status === 'pending' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            busyId === booking.id ||
                                                            booking.quote_pending ||
                                                            booking.transportation_fee_pending ||
                                                            booking.deposit_status !== 'received'
                                                        }
                                                        onClick={() => act(booking.id, 'accept')}
                                                        className="flex items-center gap-1.5 rounded-full bg-[#2E7D46] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />{' '}
                                                        {booking.quote_pending || booking.transportation_fee_pending
                                                            ? 'Waiting for quote approval'
                                                            : booking.deposit_status !== 'received'
                                                              ? 'Waiting for deposit'
                                                              : 'Confirm booking'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={busyId === booking.id}
                                                        onClick={() => act(booking.id, 'decline')}
                                                        className="flex items-center gap-1.5 rounded-full border border-[#A13F3F] px-4 py-1.5 text-sm font-semibold text-[#A13F3F] transition hover:bg-[#F5E0E0] disabled:opacity-50"
                                                    >
                                                        <X className="h-3.5 w-3.5" />{' '}
                                                        Decline
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                        {messageOpen[booking.id] && (
                                            <div className="mt-3">
                                                <label htmlFor={`msg-${booking.id}`} className="mb-1.5 block text-sm font-medium text-[#4a4a4a]">
                                                    Message to client <span className="font-normal">(optional)</span>
                                                </label>
                                                <textarea
                                                    id={`msg-${booking.id}`}
                                                    rows={3}
                                                    maxLength={300}
                                                    autoFocus
                                                    value={messages[booking.id] ?? ''}
                                                    onChange={(e) => setMessages((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                                                    placeholder="e.g. Looking forward to it! Please arrive 10 mins early."
                                                    className="w-full resize-none rounded-lg border border-[#c9a66b] bg-[#fffcf8] px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#4a4a4a]/60 focus-visible:border-[#8a6a2f] focus-visible:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {reviews.length > 0 && <section className="mb-8 rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                    Client feedback
                                </p>
                                <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">
                                    Reviews
                                </h2>
                            </div>
                            <span className="rounded-full bg-[#f4e9e5] px-3 py-1 text-sm font-semibold text-[#8a6a2f]">
                                {
                                    reviews.filter(
                                        (review) => !review.is_approved,
                                    ).length
                                }{' '}
                                awaiting approval
                            </span>
                        </div>
                        {reviews.length === 0 ? (
                            <p className="text-sm text-[#4a4a4a]">
                                Reviews from completed sessions will appear
                                here.
                            </p>
                        ) : (
                            <div className="grid gap-3">
                                {reviews.map((review) => (
                                    <article
                                        key={review.id}
                                        className="rounded-2xl border border-[#f0e2dd] bg-[#fffcf8] p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-[#1a1a1a]">
                                                    {'★'.repeat(review.rating)}
                                                    {'☆'.repeat(
                                                        5 - review.rating,
                                                    )}{' '}
                                                    <span className="ml-1 text-sm font-medium text-[#4a4a4a]">
                                                        {review.client.name} ·{' '}
                                                        {review.booking.service}
                                                    </span>
                                                </p>
                                                <p className="mt-2 text-sm leading-6 whitespace-pre-line text-[#4a4a4a]">
                                                    {review.comment}
                                                </p>
                                                <p className="mt-2 text-sm text-[#6b625a]">
                                                    Session on{' '}
                                                    {formatDate(
                                                        review.booking
                                                            .booking_date,
                                                    )}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={
                                                    reviewBusyId === review.id
                                                }
                                                onClick={() =>
                                                    setReviewApproval(
                                                        review.id,
                                                        !review.is_approved,
                                                    )
                                                }
                                                className="shrink-0 rounded-full border border-[#c9a66b] px-4 py-2 text-sm font-semibold text-[#8a6a2f] disabled:opacity-50"
                                            >
                                                {reviewBusyId === review.id
                                                    ? 'Saving…'
                                                    : review.is_approved
                                                      ? 'Hide from homepage'
                                                      : 'Approve & publish'}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>}

                    {/* schedule */}
                    <div className="mb-5">
                        <p className="text-sm font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                            Plan your day
                        </p>
                        <h2 className="mt-1 mb-4 font-serif text-2xl font-bold text-[#1a1a1a]">
                            Your schedule
                        </h2>
                    </div>
                    <div className="mb-6 inline-flex rounded-full border border-[#e8d7cf] bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTab('upcoming')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                tab === 'upcoming'
                                    ? 'bg-[#8a6a2f] text-white shadow-sm'
                                    : 'text-[#4a4a4a] hover:text-[#8a6a2f]'
                            }`}
                        >
                            Upcoming ({upcoming.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('past')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                tab === 'past'
                                    ? 'bg-[#8a6a2f] text-white shadow-sm'
                                    : 'text-[#4a4a4a] hover:text-[#8a6a2f]'
                            }`}
                        >
                            Past ({past.length})
                        </button>
                    </div>

                    {visible.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#d7c0a2] bg-white/80 px-6 py-16 text-center shadow-sm">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4e9e5] text-[#8a6a2f]">
                                <Sparkles className="h-7 w-7" />
                            </span>
                            <p className="font-serif text-lg font-bold text-[#1a1a1a]">
                                {tab === 'upcoming'
                                    ? 'No upcoming sessions'
                                    : 'No past sessions'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {visible.map((booking) => (
                                <div
                                    key={booking.id}
                                    id={`booking-${booking.id}`}
                                    className="rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm shadow-[#c9a66b]/10 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
                                >
                                    <BookingHeader
                                        booking={booking}
                                        onViewInspo={setViewingUrl}
                                    />
                                    <BookingActivityTimeline booking={booking} />
                                    {booking.status === 'confirmed' && (
                                        <button
                                            type="button"
                                            disabled={busyId === booking.id}
                                            onClick={() =>
                                                act(booking.id, 'complete')
                                            }
                                            className="mt-4 rounded-full border border-[#8a6a2f] px-4 py-1.5 text-sm font-semibold text-[#8a6a2f] transition hover:bg-[#f4e9e5] disabled:opacity-50"
                                        >
                                            Mark as Completed
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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
                        aria-label="Close"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <img
                        src={viewingUrl}
                        alt="Inspo full view"
                        className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
            {depositConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="deposit-confirmation-title"
                        className="w-full max-w-md rounded-2xl border border-[#e8d7cf] bg-white p-6 shadow-xl"
                    >
                        <h2 id="deposit-confirmation-title" className="font-serif text-xl font-bold text-[#1a1a1a]">
                            Verify payment and confirm booking
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-[#51463e]">
                            Are you sure you received the client’s deposit of{' '}
                            <strong>
                                ₱{Number(
                                    depositConfirmation.deposit_amount ??
                                        Number(depositConfirmation.estimated_total ?? 0) / 2,
                                ).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </strong>
                            {depositConfirmation.deposit_method && (
                                <> via <strong>{depositConfirmation.deposit_method === 'bank_transfer' ? 'bank transfer' : depositConfirmation.deposit_method.toUpperCase()}</strong></>
                            )}? Confirm only after you have verified the payment. This will also confirm the booking at the total the client accepted.
                        </p>
                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={busyId === depositConfirmation.id}
                                onClick={() => setDepositConfirmation(null)}
                                className="rounded-full border border-[#d7c0a2] px-4 py-2 text-sm font-semibold text-[#6a5542] transition hover:bg-[#faf6f2] disabled:opacity-50"
                            >
                                Go back
                            </button>
                            <button
                                type="button"
                                disabled={busyId === depositConfirmation.id}
                                onClick={() => markDepositReceived(depositConfirmation)}
                                className="rounded-full bg-[#2E7D46] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50"
                            >
                                {busyId === depositConfirmation.id ? 'Saving…' : 'Verify & confirm booking'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}

function BookingHeader({
    booking,
    onViewInspo,
    children,
}: {
    booking: Booking;
    onViewInspo: (url: string) => void;
    children?: React.ReactNode;
}) {
    const { occasion, text } = splitNotes(booking.notes);
    const hasMoreDetails = Boolean(children) || Boolean(
        booking.terms_accepted_at || booking.base_price != null || booking.final_makeup_price != null || booking.selected_add_ons?.length ||
        booking.venue_address || booking.estimated_total != null ||
        booking.quote_reason || booking.client.phone || occasion || text ||
        booking.artist_message || booking.inspo_url,
    );

    return (
        <>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="font-serif text-lg font-bold text-[#1a1a1a]">
                        {booking.service}
                    </p>
                    <p className="text-sm text-[#4a4a4a]">
                        with {booking.client.name}
                    </p>
                    {booking.service_area_level === 'on_request' && (
                        <span className="mt-2 inline-flex max-w-full rounded-full bg-[#fff2d8] px-3 py-1 text-xs font-semibold text-[#76551e]">
                            On request · review location and quote travel
                        </span>
                    )}
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${STATUS_STYLES[booking.status]}`}
                >
                    {booking.status}
                </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#4a4a4a]">
                <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[#8a6a2f]" />
                    {formatDate(booking.booking_date)}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#8a6a2f]" />
                    {formatTime(booking.booking_time)}
                </span>
            </div>

            {hasMoreDetails && <details className="group mt-3 rounded-xl bg-[#faf7f4] px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#704f1e] marker:hidden">
                <span><span className="group-open:hidden">View booking details</span><span className="hidden group-open:inline">Hide booking details</span></span>
                <span aria-hidden="true" className="text-lg leading-none transition-transform group-open:rotate-90">&gt;</span>
            </summary>
            <div className="pt-3">
            {children}
            {booking.terms_accepted_at && (
                <p className="mb-3 text-sm text-[#4a4a4a]">
                    Booking terms accepted on {new Date(booking.terms_accepted_at).toLocaleString('en-PH')}.
                </p>
            )}
            <BookingItemizedPricing
                basePrice={booking.base_price}
                basePriceType={booking.base_price_type}
                finalMakeupPrice={booking.final_makeup_price}
                addOns={booking.selected_add_ons}
                total={booking.estimated_total}
                quoteAccepted={booking.quote_accepted_at}
                quotePending={Boolean(
                    booking.quote_pending || booking.transportation_fee_pending,
                )}
                depositStatus={booking.deposit_status}
                depositAmount={booking.deposit_amount}
                remainingBalance={booking.remaining_balance}
            />
            {booking.venue_address && (
                <p className="mb-3 text-sm text-[#4a4a4a]">
                    Home service ·{' '}
                    {booking.location_type === 'nearby_province'
                        ? 'Nearby province'
                        : 'Metro Manila'}{' '}
                    · {booking.venue_address}
                    {booking.venue_latitude != null && booking.venue_longitude != null && (
                        <>
                            {' · '}
                            <a
                                href={`https://www.openstreetmap.org/?mlat=${booking.venue_latitude}&mlon=${booking.venue_longitude}#map=18/${booking.venue_latitude}/${booking.venue_longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-[#76551e] underline underline-offset-2"
                            >
                                Open map pin
                            </a>
                        </>
                    )}
                </p>
            )}
            {booking.quote_reason && (
                <p className="mb-3 text-sm text-[#4a4a4a]">
                    Quote note: {booking.quote_reason}
                </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-[#4a4a4a]">
                {booking.client.phone && (
                    <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-[#8a6a2f]" />{' '}
                        {booking.client.phone}
                    </span>
                )}
            </div>
            {(occasion || text || booking.inspo_url) && (
                <section className="mb-3 rounded-xl border border-[#e8d7cf] bg-white p-3">
                    <h3 className="mb-2 text-sm font-semibold text-[#1a1a1a]">Client&apos;s makeup preferences</h3>
                    {occasion && <p className="text-sm text-[#4a4a4a]"><span className="font-medium">Occasion:</span> {occasion}</p>}
                    {text && <p className="mt-1 rounded-lg bg-[#faf7f4] px-3 py-2 text-sm whitespace-pre-line text-[#1a1a1a]">{text}</p>}
                    {booking.inspo_url && (
                        <button type="button" onClick={() => onViewInspo(booking.inspo_url!)} className="mt-2 flex min-h-12 items-center gap-2 rounded-lg border border-[#c9a66b] bg-[#fffcf8] p-2 transition hover:bg-[#f4e9e5]">
                            <img src={booking.inspo_url} alt="Client makeup inspiration" className="h-10 w-10 rounded-md object-cover" />
                            <span className="flex items-center gap-1 text-sm font-semibold text-[#8a6a2f]"><ImageIcon className="h-3.5 w-3.5" /> View makeup inspiration</span>
                        </button>
                    )}
                </section>
            )}
            {booking.artist_message && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#f4e9e5] px-3 py-2 text-sm text-[#8a6a2f]">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {booking.artist_message}
                </p>
            )}
            <Link href={`/artist/clients/${booking.client.id}/inspo`} className="mt-3 inline-flex rounded-full border border-[#c9a66b] px-4 py-2 text-sm font-semibold text-[#8a6a2f] transition hover:bg-[#f4e9e5]">
                View client inspiration history
            </Link>
            </div>
            </details>}
        </>
    );
}
