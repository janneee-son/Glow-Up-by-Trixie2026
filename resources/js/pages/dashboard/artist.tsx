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
    selected_add_ons?: { id: number; name: string; price: number | string | null; quantity: number; line_total: number | string | null; pricing_type: string }[] | null;
    requires_quote?: boolean;
    booking_date: string;
    booking_time: string;
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
    pending: 'bg-[#E6EEF8] text-[#4A6A93]',
    confirmed: 'bg-[#DFF5E1] text-[#2E7D46]',
    completed: 'bg-[#E6E6FA] text-[#5B4B9C]',
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

            <div className="min-h-screen bg-[#F8F5F4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="dashboard"
                />

                <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#EADDE3] bg-gradient-to-br from-[#FFF9F6] via-white to-[#F2EDF7] p-6 shadow-lg shadow-[#BDA6B5]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-[#EADDE3]/50 blur-2xl" />
                        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                            <div>
                                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#EADDE3] bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-[#9B7085] uppercase">
                                    <Sparkles className="h-3.5 w-3.5" /> Artist
                                    studio
                                </span>
                                <h1 className="font-serif text-3xl font-bold tracking-tight text-[#312532] sm:text-4xl">
                                    Welcome back,{' '}
                                    {auth?.user?.name?.split(' ')[0] ?? 'there'}
                                    !
                                </h1>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-[#766976] sm:text-base">
                                    Your schedule, client requests, and
                                    completed looks—all in one place.
                                </p>
                            </div>
                            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-full border border-white bg-white/70 text-[#B47B94] shadow-sm sm:flex">
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
                        <div className="rounded-2xl border border-[#EADDE3] bg-white p-4 shadow-sm shadow-[#BDA6B5]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#967D8B] uppercase">
                                Needs your reply
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#A75F78]">
                                {pending.length}
                            </p>
                            <p className="mt-1 text-xs text-[#827681]">
                                Pending client requests
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#EADDE3] bg-white p-4 shadow-sm shadow-[#BDA6B5]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#967D8B] uppercase">
                                On your schedule
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#5F83AB]">
                                {upcoming.length}
                            </p>
                            <p className="mt-1 text-xs text-[#827681]">
                                Upcoming sessions
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#EADDE3] bg-white p-4 shadow-sm shadow-[#BDA6B5]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#967D8B] uppercase">
                                Beautifully done
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#718B72]">
                                {completedCount}
                            </p>
                            <p className="mt-1 text-xs text-[#827681]">
                                Completed bookings
                            </p>
                        </div>
                    </section>

                    {/* pending requests */}
                    {pending.length > 0 && (
                        <div className="mb-9">
                            <div className="mb-3 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold tracking-[0.16em] text-[#A2768B] uppercase">
                                        Your inbox
                                    </p>
                                    <h2 className="mt-1 font-serif text-2xl font-bold text-[#312532]">
                                        Pending requests
                                    </h2>
                                </div>
                                <span className="rounded-full bg-[#F4E8EE] px-3 py-1 text-sm font-semibold text-[#A75F78]">
                                    {pending.length} waiting
                                </span>
                            </div>
                            <div className="grid gap-4">
                                {pending.map((booking) => (
                                    <div
                                        key={booking.id}
                                        id={`booking-${booking.id}`}
                                        className="rounded-3xl border border-[#E4D2DC] bg-white p-5 shadow-md shadow-[#BDA6B5]/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#BDA6B5]/15 sm:p-6"
                                    >
                                        <BookingHeader
                                            booking={booking}
                                            onViewInspo={setViewingUrl}
                                        />

                                        {/* optional message to client */}
                                        <div className="mt-4 grid gap-1.5">
                                            <label
                                                htmlFor={`msg-${booking.id}`}
                                                className="flex items-center gap-1.5 text-xs font-medium text-[#5B6B82]"
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
                                                className="w-full resize-none rounded-lg border border-[#95B1DB] bg-[#FAFCFE] px-3 py-2 text-sm text-[#1F2D40] placeholder:text-[#5B6B82]/60 focus-visible:border-[#769AD0] focus-visible:outline-none"
                                            />
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                disabled={busyId === booking.id}
                                                onClick={() =>
                                                    act(booking.id, 'accept')
                                                }
                                                className="flex items-center gap-1.5 rounded-full bg-[#2E7D46] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50"
                                            >
                                                <Check className="h-3.5 w-3.5" />{' '}
                                                Accept
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
                        <p className="text-xs font-semibold tracking-[0.16em] text-[#A2768B] uppercase">
                            Plan your day
                        </p>
                        <h2 className="mt-1 mb-4 font-serif text-2xl font-bold text-[#312532]">
                            Your schedule
                        </h2>
                    </div>
                    <div className="mb-6 inline-flex rounded-full border border-[#EADDE3] bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTab('upcoming')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                tab === 'upcoming'
                                    ? 'bg-[#A8758B] text-white shadow-sm'
                                    : 'text-[#766976] hover:text-[#A75F78]'
                            }`}
                        >
                            Upcoming ({upcoming.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('past')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                tab === 'past'
                                    ? 'bg-[#A8758B] text-white shadow-sm'
                                    : 'text-[#766976] hover:text-[#A75F78]'
                            }`}
                        >
                            Past ({past.length})
                        </button>
                    </div>

                    {visible.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#DCCAD4] bg-white/80 px-6 py-16 text-center shadow-sm">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F7EAF0] text-[#A8758B]">
                                <Sparkles className="h-7 w-7" />
                            </span>
                            <p className="font-serif text-lg font-bold text-[#312532]">
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
                                    className="rounded-3xl border border-[#EADDE3] bg-white p-5 shadow-sm shadow-[#BDA6B5]/10 transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
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
                                            className="mt-4 rounded-full border border-[#5B4B9C] px-4 py-1.5 text-xs font-semibold text-[#5B4B9C] transition hover:bg-[#E6E6FA] disabled:opacity-50"
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
                    <p className="font-serif text-lg font-bold text-[#1F2D40]">
                        {booking.service}
                    </p>
                    {booking.base_price_type && <p className="mt-1 text-sm font-semibold text-[#A75F78]">
                        {booking.requires_quote ? 'Final price to be confirmed' : `${booking.base_price_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(booking.base_price ?? 0).toLocaleString('en-PH')}`}
                    </p>}
                    <p className="text-sm text-[#5B6B82]">
                        with {booking.client.name}
                    </p>
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[booking.status]}`}
                >
                    {booking.status}
                </span>
            </div>

            {!!booking.selected_add_ons?.length && <p className="mb-3 text-xs text-[#5B6B82]">Client add-ons: {booking.selected_add_ons.map((item) => `${item.name} × ${item.quantity}${item.line_total == null ? '' : ` (₱${Number(item.line_total).toLocaleString('en-PH')})`}`).join(', ')}</p>}
            {booking.estimated_total != null && <p className="mb-3 text-sm font-semibold text-[#312532]">{booking.requires_quote ? 'Known subtotal' : 'Estimated total'}: ₱{Number(booking.estimated_total).toLocaleString('en-PH')}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-[#5B6B82]">
                <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#5F83AB]" />{' '}
                    {formatDate(booking.booking_date)}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#5F83AB]" />{' '}
                    {formatTime(booking.booking_time)}
                </span>
                {booking.client.phone && (
                    <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-[#5F83AB]" />{' '}
                        {booking.client.phone}
                    </span>
                )}
            </div>

            {occasion && (
                <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-[#5B6B82]">
                        Occasion
                    </p>
                    <span className="inline-block rounded-full bg-[#E6EEF8] px-3 py-1 text-xs font-semibold text-[#5F83AB]">
                        {occasion}
                    </span>
                </div>
            )}

            {text && (
                <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-[#5B6B82]">
                        Client's notes
                    </p>
                    <p className="rounded-lg bg-[#F2F5F8] px-3 py-2 text-sm whitespace-pre-line text-[#1F2D40]">
                        {text}
                    </p>
                </div>
            )}

            {booking.artist_message && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#E6E6FA] px-3 py-2 text-sm text-[#5B4B9C]">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />{' '}
                    {booking.artist_message}
                </p>
            )}

            {booking.inspo_url && (
                <button
                    type="button"
                    onClick={() => onViewInspo(booking.inspo_url!)}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-[#95B1DB] bg-[#FAFCFE] p-2 transition hover:bg-[#E6EEF8]"
                >
                    <img
                        src={booking.inspo_url}
                        alt="Inspo"
                        className="h-10 w-10 rounded-md object-cover"
                    />
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#5F83AB]">
                        <ImageIcon className="h-3.5 w-3.5" /> View makeup inspo
                    </span>
                </button>
            )}
        </>
    );
}
