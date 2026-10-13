import { Head, router, usePage } from '@inertiajs/react';
import {
    Check,
    Clock,
    ImageIcon,
    MapPin,
    MessageSquare,
    Phone,
    Sparkles,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';

type Booking = {
    id: number;
    service: string;
    base_price?: number | string | null;
    base_price_type?: 'fixed' | 'starting_at' | 'quote_required';
    estimated_total?: number | string | null;
    transportation_fee_pending?: boolean;
    final_makeup_price?: number | string | null;
    quote_reason?: string | null;
    quote_pending?: boolean;
    quote_accepted_at?: string | null;
    deposit_status?: 'not_due' | 'due' | 'submitted' | 'received';
    deposit_reference?: string | null;
    selected_add_ons?: { id: number | null; name: string; price: number | string | null; quantity: number; line_total: number | string | null; pricing_type: string; is_system_fee?: boolean }[] | null;
    requires_quote?: boolean;
    booking_date: string;
    booking_time: string;
    location_type?: string | null;
    venue_address?: string | null;
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

type Props = {
    bookings: Booking[];
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

/** Splits saved notes into the "Occasion: X" first line and the client's own text. */
function splitNotes(notes: string | null) {
    if (!notes) return { occasion: null as string | null, text: '' };
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

export default function ArtistDashboard({ bookings }: Props) {
    const { auth } = usePage<{
        auth?: {
            user?: { name?: string; role?: 'client' | 'artist' | 'admin' };
        };
    }>().props;
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [busyId, setBusyId] = useState<number | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<number, string>>({});
    const [makeupPrices, setMakeupPrices] = useState<Record<number, string>>({});
    const [transportationFees, setTransportationFees] = useState<Record<number, string>>({});
    const [quoteReasons, setQuoteReasons] = useState<Record<number, string>>({});
    const [quoteErrors, setQuoteErrors] = useState<Record<number, string>>({});

    const pending = useMemo(
        () => bookings.filter((b) => b.status === 'pending'),
        [bookings],
    );
    const completedCount = useMemo(
        () => bookings.filter((b) => b.status === 'completed').length,
        [bookings],
    );

    const { upcoming, past } = useMemo(() => {
        const upcoming: Booking[] = [];
        const past: Booking[] = [];
        for (const b of bookings) {
            if (b.status === 'pending') continue;
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
        const makeupPrice = makeupPrices[booking.id] ?? String(booking.final_makeup_price ?? booking.base_price ?? '');
        const fee = transportationFees[booking.id] ?? transportationFeeForBooking(booking);
        const reason = quoteReasons[booking.id] ?? booking.quote_reason ?? '';

        setBusyId(booking.id);
        setQuoteErrors((current) => ({ ...current, [booking.id]: '' }));
        router.patch(
            `/book/${booking.id}/quote`,
            { final_makeup_price: makeupPrice, transportation_fee: fee, quote_reason: reason },
            {
                preserveScroll: true,
                onError: (errors) => setQuoteErrors((current) => ({
                    ...current,
                    [booking.id]: String(errors.quote_reason ?? errors.final_makeup_price ?? errors.transportation_fee ?? 'Could not send the final quote.'),
                })),
                onFinish: () => {
                    setBusyId(null);
                },
            },
        );
    }

    function markDepositReceived(booking: Booking) {
        setBusyId(booking.id);
        router.patch(`/book/${booking.id}/deposit/received`, {}, {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    }

    useEffect(() => {
        if (!viewingUrl) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setViewingUrl(null);
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
                                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8d7cf] bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
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

                    <section
                        aria-label="Booking summary"
                        className="mb-8 grid gap-3 sm:grid-cols-3"
                    >
                        <div className="rounded-2xl border border-[#e8d7cf] bg-white p-4 shadow-sm shadow-[#c9a66b]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#4a4a4a] uppercase">
                                Needs your reply
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#8a6a2f]">
                                {pending.length}
                            </p>
                            <p className="mt-1 text-xs text-[#4a4a4a]">
                                Pending client requests
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#e8d7cf] bg-white p-4 shadow-sm shadow-[#c9a66b]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#4a4a4a] uppercase">
                                On your schedule
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#8a6a2f]">
                                {upcoming.length}
                            </p>
                            <p className="mt-1 text-xs text-[#4a4a4a]">
                                Upcoming sessions
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#e8d7cf] bg-white p-4 shadow-sm shadow-[#c9a66b]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#4a4a4a] uppercase">
                                Beautifully done
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#718B72]">
                                {completedCount}
                            </p>
                            <p className="mt-1 text-xs text-[#4a4a4a]">
                                Completed bookings
                            </p>
                        </div>
                    </section>

                    {/* pending requests */}
                    {pending.length > 0 && (
                        <div className="mb-9">
                            <div className="mb-3 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
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
                                        />

                                        <div className="mt-4 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                            <h3 className="text-sm font-semibold text-[#1a1a1a]">Prepare the final quote</h3>
                                            <p className="mt-1 text-xs leading-5 text-[#4a4a4a]">
                                                Review the inspiration and address, then send one itemized makeup and transportation price for the client to approve.
                                            </p>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <label htmlFor={`makeup-price-${booking.id}`} className="mb-1 block text-xs font-medium text-[#4a4a4a]">Final makeup price (₱)</label>
                                                    <input
                                                        id={`makeup-price-${booking.id}`}
                                                        type="number"
                                                        min={0}
                                                        max={1000000}
                                                        step="0.01"
                                                        inputMode="decimal"
                                                        value={makeupPrices[booking.id] ?? String(booking.final_makeup_price ?? booking.base_price ?? '')}
                                                        onChange={(event) => setMakeupPrices((current) => ({ ...current, [booking.id]: event.target.value }))}
                                                        className="w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor={`travel-fee-${booking.id}`} className="mb-1 block text-xs font-medium text-[#4a4a4a]">Transportation fee (₱)</label>
                                                    <input
                                                        id={`travel-fee-${booking.id}`}
                                                        type="number"
                                                        min={0}
                                                        max={1000000}
                                                        step={1}
                                                        inputMode="numeric"
                                                        value={transportationFees[booking.id] ?? transportationFeeForBooking(booking)}
                                                        onChange={(event) => setTransportationFees((current) => ({ ...current, [booking.id]: event.target.value }))}
                                                        className="w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label htmlFor={`quote-reason-${booking.id}`} className="mb-1 block text-xs font-medium text-[#4a4a4a]">Reason for a price above the starting price</label>
                                                <textarea
                                                    id={`quote-reason-${booking.id}`}
                                                    rows={2}
                                                    maxLength={500}
                                                    value={quoteReasons[booking.id] ?? booking.quote_reason ?? ''}
                                                    onChange={(event) => setQuoteReasons((current) => ({ ...current, [booking.id]: event.target.value }))}
                                                    placeholder="For example, the requested look needs extra styling or preparation."
                                                    className="w-full resize-y rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#4a4a4a]/60 focus-visible:border-[#8a6a2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                disabled={busyId === booking.id || makeupPrices[booking.id] === '' || transportationFees[booking.id] === '' || Number(makeupPrices[booking.id] ?? booking.final_makeup_price ?? booking.base_price ?? 0) < 0 || Number(transportationFees[booking.id] ?? 0) < 0}
                                                onClick={() => sendQuote(booking)}
                                                className="mt-3 rounded-full bg-[#8a6a2f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6f5325] disabled:opacity-50"
                                            >
                                                {busyId === booking.id ? 'Sending…' : 'Send itemized quote'}
                                            </button>
                                            {quoteErrors[booking.id] && <p role="alert" className="mt-2 text-xs text-[#A13F3F]">{quoteErrors[booking.id]}</p>}
                                        </div>

                                        {(booking.quote_pending || booking.transportation_fee_pending) && <p className="mt-3 rounded-xl border border-[#c9a66b] bg-[#fffcf8] px-4 py-3 text-sm font-medium text-[#8a6a2f]">The itemized quote is with the client. They must approve it before the deposit step.</p>}
                                        {booking.quote_accepted_at && booking.deposit_status === 'due' && <p className="mt-3 rounded-xl border border-[#c9a66b] bg-[#fffcf8] px-4 py-3 text-sm font-medium text-[#8a6a2f]">Quote accepted. Waiting for the 50% deposit of ₱{(Number(booking.estimated_total ?? 0) / 2).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.</p>}
                                        {booking.deposit_status === 'submitted' && (
                                            <div className="mt-3 rounded-xl border border-[#c9a66b] bg-[#fffcf8] p-4 text-sm">
                                                <p className="font-semibold text-[#1a1a1a]">Client marked the deposit as sent</p>
                                                <p className="mt-1 text-[#4a4a4a]">Reference or note: {booking.deposit_reference}</p>
                                                <button type="button" disabled={busyId === booking.id} onClick={() => markDepositReceived(booking)} className="mt-3 rounded-full bg-[#2E7D46] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50">{busyId === booking.id ? 'Saving…' : 'Mark deposit received'}</button>
                                            </div>
                                        )}
                                        {booking.deposit_status === 'received' && <p className="mt-3 rounded-xl border border-[#b7d5bb] bg-[#f1f7f1] px-4 py-3 text-sm font-medium text-[#426948]">50% deposit received. You can now confirm the booking.</p>}

                                        {/* optional message to client */}
                                        <div className="mt-4 grid gap-1.5">
                                            <label
                                                htmlFor={`msg-${booking.id}`}
                                                className="flex items-center gap-1.5 text-xs font-medium text-[#4a4a4a]"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />{' '}
                                                Message to client{' '}
                                                <span className="font-normal">
                                                    (optional)
                                                </span>
                                            </label>
                                            <textarea
                                                id={`msg-${booking.id}`}
                                                rows={2}
                                                maxLength={300}
                                                value={
                                                    messages[booking.id] ?? ''
                                                }
                                                onChange={(e) =>
                                                    setMessages((prev) => ({
                                                        ...prev,
                                                        [booking.id]:
                                                            e.target.value,
                                                    }))
                                                }
                                                placeholder="e.g. Looking forward to it! Please arrive 10 mins early."
                                                className="w-full resize-none rounded-lg border border-[#c9a66b] bg-[#fffcf8] px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#4a4a4a]/60 focus-visible:border-[#8a6a2f] focus-visible:outline-none"
                                            />
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                disabled={busyId === booking.id || booking.quote_pending || booking.transportation_fee_pending || booking.deposit_status !== 'received'}
                                                onClick={() =>
                                                    act(booking.id, 'accept')
                                                }
                                                className="flex items-center gap-1.5 rounded-full bg-[#2E7D46] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50"
                                            >
                                                <Check className="h-3.5 w-3.5" />{' '}
                                                {booking.quote_pending || booking.transportation_fee_pending ? 'Waiting for quote approval' : booking.deposit_status !== 'received' ? 'Waiting for deposit' : 'Confirm booking'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busyId === booking.id}
                                                onClick={() =>
                                                    act(booking.id, 'decline')
                                                }
                                                className="flex items-center gap-1.5 rounded-full border border-[#A13F3F] px-4 py-1.5 text-xs font-semibold text-[#A13F3F] transition hover:bg-[#F5E0E0] disabled:opacity-50"
                                            >
                                                <X className="h-3.5 w-3.5" />{' '}
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* schedule */}
                    <div className="mb-5">
                        <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
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
                                    {booking.status === 'confirmed' && (
                                        <button
                                            type="button"
                                            disabled={busyId === booking.id}
                                            onClick={() =>
                                                act(booking.id, 'complete')
                                            }
                                            className="mt-4 rounded-full border border-[#8a6a2f] px-4 py-1.5 text-xs font-semibold text-[#8a6a2f] transition hover:bg-[#f4e9e5] disabled:opacity-50"
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
        </>
    );
}

function BookingHeader({
    booking,
    onViewInspo,
}: {
    booking: Booking;
    onViewInspo: (url: string) => void;
}) {
    const { occasion, text } = splitNotes(booking.notes);

    return (
        <>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="font-serif text-lg font-bold text-[#1a1a1a]">
                        {booking.service}
                    </p>
                    {booking.final_makeup_price != null ? (
                        <p className="mt-1 text-sm font-semibold text-[#8a6a2f]">Final makeup quote: ₱{Number(booking.final_makeup_price).toLocaleString('en-PH')}</p>
                    ) : booking.base_price_type && (
                        <p className="mt-1 text-sm font-semibold text-[#8a6a2f]">
                            {booking.requires_quote || booking.base_price_type === 'quote_required' ? 'Artist quote needed' : `${booking.base_price_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(booking.base_price ?? 0).toLocaleString('en-PH')}`}
                        </p>
                    )}
                    <p className="text-sm text-[#4a4a4a]">
                        with {booking.client.name}
                    </p>
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[booking.status]}`}
                >
                    {booking.status}
                </span>
            </div>

            {!!booking.selected_add_ons?.length && <p className="mb-3 text-xs text-[#4a4a4a]">Client add-ons: {booking.selected_add_ons.map((item) => `${item.name} × ${item.quantity}${item.line_total == null ? '' : ` (₱${Number(item.line_total).toLocaleString('en-PH')})`}`).join(', ')}</p>}
            {booking.venue_address && <p className="mb-3 text-sm text-[#4a4a4a]">Home service · {booking.location_type === 'nearby_province' ? 'Nearby province' : 'Metro Manila'} · {booking.venue_address}</p>}
            {booking.estimated_total != null && <p className="mb-3 text-sm font-semibold text-[#1a1a1a]">{booking.quote_accepted_at ? 'Final quoted total' : booking.quote_pending ? 'Quote sent for client approval' : 'Starting estimate'}: ₱{Number(booking.estimated_total).toLocaleString('en-PH')}</p>}
            {booking.quote_reason && <p className="mb-3 text-sm text-[#4a4a4a]">Quote note: {booking.quote_reason}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-[#4a4a4a]">
                <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#8a6a2f]" />{' '}
                    {formatDate(booking.booking_date)}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#8a6a2f]" />{' '}
                    {formatTime(booking.booking_time)}
                </span>
                {booking.client.phone && (
                    <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-[#8a6a2f]" />{' '}
                        {booking.client.phone}
                    </span>
                )}
            </div>

            {occasion && (
                <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-[#4a4a4a]">
                        Occasion
                    </p>
                    <span className="inline-block rounded-full bg-[#f4e9e5] px-3 py-1 text-xs font-semibold text-[#8a6a2f]">
                        {occasion}
                    </span>
                </div>
            )}

            {text && (
                <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-[#4a4a4a]">
                        Client's notes
                    </p>
                    <p className="rounded-lg bg-[#faf7f4] px-3 py-2 text-sm whitespace-pre-line text-[#1a1a1a]">
                        {text}
                    </p>
                </div>
            )}

            {booking.artist_message && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#f4e9e5] px-3 py-2 text-sm text-[#8a6a2f]">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />{' '}
                    {booking.artist_message}
                </p>
            )}

            {booking.inspo_url && (
                <button
                    type="button"
                    onClick={() => onViewInspo(booking.inspo_url!)}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-[#c9a66b] bg-[#fffcf8] p-2 transition hover:bg-[#f4e9e5]"
                >
                    <img
                        src={booking.inspo_url}
                        alt="Inspo"
                        className="h-10 w-10 rounded-md object-cover"
                    />
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#8a6a2f]">
                        <ImageIcon className="h-3.5 w-3.5" /> View makeup inspo
                    </span>
                </button>
            )}
        </>
    );
}
