import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarPlus,
    CalendarDays,
    Clock,
    ImageIcon,
    MapPin,
    MessageSquare,
    Phone,
    Sparkles,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    cancelled_by: 'client' | 'artist' | null;
    notes: string | null;
    artist_message: string | null;
    inspo_url: string | null;
    artist: {
        id: number;
        name: string;
        phone: string | null;
        specialty: string | null;
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

const CANCEL_CUTOFF_HOURS = 24;

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

// Uses local time (not UTC) so the minimum date is correct in the Philippines.
function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

/** Splits saved notes into the "Occasion: X" first line and the client's own text. */
function splitNotes(notes: string | null) {
    if (!notes) return { occasion: null as string | null, text: '' };
    const m = notes.match(/^Occasion: (.+?)(?:\n|$)/);
    return m
        ? { occasion: m[1], text: notes.slice(m[0].length).trim() }
        : { occasion: null, text: notes };
}

function appointmentDate(booking: Booking) {
    return new Date(`${booking.booking_date}T${booking.booking_time}`);
}

function isPast(booking: Booking) {
    return (
        appointmentDate(booking).getTime() < Date.now() ||
        booking.status === 'completed' ||
        booking.status === 'cancelled'
    );
}

function hoursUntil(booking: Booking) {
    return (appointmentDate(booking).getTime() - Date.now()) / (1000 * 60 * 60);
}

/** Same rule governs both self-cancel and reschedule eligibility. */
function canModify(booking: Booking) {
    if (booking.status === 'pending') return true;
    if (booking.status === 'confirmed')
        return hoursUntil(booking) > CANCEL_CUTOFF_HOURS;
    return false;
}

function needsContactToCancel(booking: Booking) {
    return (
        booking.status === 'confirmed' &&
        hoursUntil(booking) <= CANCEL_CUTOFF_HOURS &&
        hoursUntil(booking) > 0
    );
}

function isArtistDeclined(booking: Booking) {
    return booking.status === 'cancelled' && booking.cancelled_by === 'artist';
}

const DISMISSED_KEY = 'dismissed_decline_notifs';

function getDismissedIds(): number[] {
    try {
        return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function dismissId(id: number) {
    const current = getDismissedIds();
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...current, id]));
}

export default function ClientDashboard({ bookings }: Props) {
    const { auth } = usePage<{
        auth?: {
            user?: { name?: string; role?: 'client' | 'artist' | 'admin' };
        };
    }>().props;
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [dismissed, setDismissed] = useState<number[]>(() =>
        typeof window !== 'undefined' ? getDismissedIds() : [],
    );

    // details modal — only the id is stored, so the modal always reads the latest data
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selectedBooking = bookings.find((b) => b.id === selectedId) ?? null;
    const selectedNotes = splitNotes(selectedBooking?.notes ?? null);

    const [rescheduling, setRescheduling] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [confirmingReschedule, setConfirmingReschedule] = useState(false);
    const [rescheduleBusy, setRescheduleBusy] = useState(false);
    const [viewingInspoUrl, setViewingInspoUrl] = useState<string | null>(null);

    const declinedNotifications = useMemo(
        () =>
            bookings.filter(
                (b) => isArtistDeclined(b) && !dismissed.includes(b.id),
            ),
        [bookings, dismissed],
    );

    const { upcoming, past } = useMemo(() => {
        const upcoming: Booking[] = [];
        const past: Booking[] = [];
        for (const b of bookings) {
            (isPast(b) ? past : upcoming).push(b);
        }
        return { upcoming, past };
    }, [bookings]);

    const visible = tab === 'upcoming' ? upcoming : past;
    const pendingCount = upcoming.filter(
        (booking) => booking.status === 'pending',
    ).length;
    const completedCount = bookings.filter(
        (booking) => booking.status === 'completed',
    ).length;

    function closeDetails() {
        setSelectedId(null);
        setRescheduling(false);
        setConfirmingReschedule(false);
        setConfirmingId(null);
    }

    function handleCancel(id: number) {
        setCancellingId(id);
        router.patch(
            `/book/${id}/cancel`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => closeDetails(),
                onFinish: () => {
                    setCancellingId(null);
                    setConfirmingId(null);
                },
            },
        );
    }

    function handleDismiss(id: number) {
        dismissId(id);
        setDismissed((prev) => [...prev, id]);
    }

    function openDetails(booking: Booking) {
        setSelectedId(booking.id);
        setRescheduling(false);
        setConfirmingReschedule(false);
        setConfirmingId(null);
        setNewDate(booking.booking_date);
        setNewTime(booking.booking_time);
    }

    const rescheduleChanged =
        selectedBooking &&
        (newDate !== selectedBooking.booking_date ||
            newTime !== selectedBooking.booking_time);

    function handleProceed() {
        if (!rescheduleChanged) return;
        setConfirmingReschedule(true);
    }

    function handleConfirmReschedule() {
        if (!selectedBooking) return;
        setRescheduleBusy(true);
        router.patch(
            `/book/${selectedBooking.id}/reschedule`,
            { booking_date: newDate, booking_time: newTime },
            {
                preserveScroll: true,
                onSuccess: () => closeDetails(),
                onFinish: () => setRescheduleBusy(false),
            },
        );
    }

    return (
        <>
            <Head title="My Bookings" />

            <div className="min-h-screen bg-[#F8F5F4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="dashboard"
                />

                <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 md:py-10">
                    {/* decline notifications */}
                    {declinedNotifications.length > 0 && (
                        <div className="mb-6 grid gap-3">
                            {declinedNotifications.map((booking) => (
                                <div
                                    key={booking.id}
                                    className="flex items-start gap-3 rounded-2xl border-2 border-[#A13F3F]/40 bg-[#FDEDED] p-4"
                                >
                                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#A13F3F]" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-[#A13F3F]">
                                            {booking.artist.name} declined your{' '}
                                            {booking.service} booking
                                            {' · '}
                                            {formatDate(booking.booking_date)}
                                        </p>
                                        {booking.artist_message && (
                                            <p className="mt-1 text-sm text-[#5B6B82]">
                                                "{booking.artist_message}"
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDismiss(booking.id)
                                        }
                                        aria-label="Dismiss"
                                        className="shrink-0 text-[#A13F3F] transition hover:text-[#8A3434]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#EADDE3] bg-gradient-to-br from-[#FFF9F6] via-white to-[#F2EDF7] p-6 shadow-lg shadow-[#BDA6B5]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-[#EADDE3]/50 blur-2xl" />
                        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                            <div>
                                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#EADDE3] bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-[#9B7085] uppercase">
                                    <Sparkles className="h-3.5 w-3.5" /> Your
                                    beauty appointments
                                </span>
                                <h1 className="font-serif text-3xl font-bold tracking-tight text-[#312532] sm:text-4xl">
                                    Welcome back,{' '}
                                    {auth?.user?.name?.split(' ')[0] ??
                                        'beautiful'}
                                    !
                                </h1>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-[#766976] sm:text-base">
                                    Keep up with your sessions and get ready for
                                    your next glow-up.
                                </p>
                            </div>
                            <Link
                                href="/book"
                                className="relative inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#A8758B] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#B47B94]/25 transition duration-200 hover:-translate-y-0.5 hover:bg-[#94677B] sm:self-auto"
                            >
                                <CalendarPlus className="h-4 w-4" /> Book a new
                                session
                            </Link>
                        </div>
                    </section>

                    <section
                        aria-label="Booking summary"
                        className="mb-8 grid gap-3 sm:grid-cols-3"
                    >
                        <div className="rounded-2xl border border-[#EADDE3] bg-white p-4 shadow-sm shadow-[#BDA6B5]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#967D8B] uppercase">
                                Coming up
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#5F83AB]">
                                {upcoming.length}
                            </p>
                            <p className="mt-1 text-xs text-[#827681]">
                                Upcoming bookings
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#EADDE3] bg-white p-4 shadow-sm shadow-[#BDA6B5]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#967D8B] uppercase">
                                Awaiting confirmation
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#A75F78]">
                                {pendingCount}
                            </p>
                            <p className="mt-1 text-xs text-[#827681]">
                                Your artist will confirm soon
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#EADDE3] bg-white p-4 shadow-sm shadow-[#BDA6B5]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#967D8B] uppercase">
                                Favorite moments
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#718B72]">
                                {completedCount}
                            </p>
                            <p className="mt-1 text-xs text-[#827681]">
                                Completed sessions
                            </p>
                        </div>
                    </section>

                    {/* upcoming / past toggle */}
                    <div className="mb-6 inline-flex rounded-full border border-[#EADDE3] bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTab('upcoming')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
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
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
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
                                    ? 'No upcoming bookings'
                                    : 'No past bookings'}
                            </p>
                            <p className="max-w-xs text-sm text-[#5B6B82]">
                                {tab === 'upcoming'
                                    ? 'When you book a session with one of our artists, it will show up here.'
                                    : 'Completed or cancelled sessions will appear here.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {visible.map((booking) => (
                                <button
                                    key={booking.id}
                                    type="button"
                                    onClick={() => openDetails(booking)}
                                    className={`rounded-3xl border bg-white p-5 text-left shadow-sm shadow-[#BDA6B5]/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#BDA6B5]/15 sm:p-6 ${
                                        isArtistDeclined(booking)
                                            ? 'border-[#A13F3F]/40'
                                            : 'border-[#D3DFEF]'
                                    }`}
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-serif text-lg font-bold text-[#1F2D40]">
                                                {booking.service}
                                            </p>
                                            {booking.base_price_type && <p className="mt-1 text-sm font-semibold text-[#A75F78]">
                                                {booking.requires_quote ? 'Final price to be confirmed' : `${booking.base_price_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(booking.base_price ?? 0).toLocaleString('en-PH')}`}
                                            </p>}
                                            <p className="text-sm text-[#5B6B82]">
                                                with {booking.artist.name}
                                                {booking.artist.specialty
                                                    ? ` · ${booking.artist.specialty}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[booking.status]}`}
                                        >
                                            {isArtistDeclined(booking)
                                                ? 'Declined'
                                                : booking.status}
                                        </span>
                                    </div>

                                    {!!booking.selected_add_ons?.length && <p className="mb-3 text-xs text-[#5B6B82]">Add-ons: {booking.selected_add_ons.map((item) => `${item.name} × ${item.quantity}${item.line_total == null ? '' : ` (₱${Number(item.line_total).toLocaleString('en-PH')})`}`).join(', ')}</p>}
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
                                    </div>

                                    {booking.artist_message && (
                                        <p
                                            className={`mt-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm ${
                                                isArtistDeclined(booking)
                                                    ? 'bg-[#FDEDED] text-[#A13F3F]'
                                                    : 'bg-[#E6E6FA] text-[#5B4B9C]'
                                            }`}
                                        >
                                            {isArtistDeclined(booking) ? (
                                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            ) : (
                                                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            )}
                                            <span>
                                                <span className="font-semibold">
                                                    {booking.artist.name}:
                                                </span>{' '}
                                                {booking.artist_message}
                                            </span>
                                        </p>
                                    )}

                                    <p className="mt-3 text-xs font-semibold text-[#5F83AB]">
                                        Tap for details →
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* booking details modal */}
            {selectedBooking && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={closeDetails}
                >
                    <div
                        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="mb-0.5 text-xs tracking-widest text-[#5F83AB] uppercase">
                                    Booking Details
                                </p>
                                <h2 className="font-serif text-xl font-bold text-[#1F2D40]">
                                    {selectedBooking.service}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetails}
                                aria-label="Close"
                                className="rounded-full p-1.5 text-[#5B6B82] transition hover:bg-[#E6EEF8] hover:text-[#5F83AB]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-[#5B6B82]">
                                with{' '}
                                <span className="font-semibold text-[#1F2D40]">
                                    {selectedBooking.artist.name}
                                </span>
                                {selectedBooking.artist.specialty
                                    ? ` · ${selectedBooking.artist.specialty}`
                                    : ''}
                            </p>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[selectedBooking.status]}`}
                            >
                                {isArtistDeclined(selectedBooking)
                                    ? 'Declined'
                                    : selectedBooking.status}
                            </span>
                        </div>

                        {!rescheduling ? (
                            <>
                                <div className="mb-4 grid gap-2 rounded-xl bg-[#F2F5F8] p-4 text-sm text-[#1F2D40]">
                                    <span className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-[#5F83AB]" />{' '}
                                        {formatDate(
                                            selectedBooking.booking_date,
                                        )}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-[#5F83AB]" />{' '}
                                        {formatTime(
                                            selectedBooking.booking_time,
                                        )}
                                    </span>
                                    {selectedBooking.artist.phone && (
                                        <span className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-[#5F83AB]" />{' '}
                                            {selectedBooking.artist.phone}
                                        </span>
                                    )}
                                </div>

                                {selectedNotes.occasion && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#5B6B82]">
                                            Occasion
                                        </p>
                                        <span className="inline-block rounded-full bg-[#E6EEF8] px-3 py-1 text-xs font-semibold text-[#5F83AB]">
                                            {selectedNotes.occasion}
                                        </span>
                                    </div>
                                )}

                                {selectedNotes.text && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#5B6B82]">
                                            Your notes
                                        </p>
                                        <p className="rounded-lg bg-[#F2F5F8] px-3 py-2 text-sm whitespace-pre-line text-[#1F2D40]">
                                            {selectedNotes.text}
                                        </p>
                                    </div>
                                )}

                                {selectedBooking.artist_message && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#5B6B82]">
                                            Message from{' '}
                                            {selectedBooking.artist.name}
                                        </p>
                                        <p
                                            className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm ${
                                                isArtistDeclined(
                                                    selectedBooking,
                                                )
                                                    ? 'bg-[#FDEDED] text-[#A13F3F]'
                                                    : 'bg-[#E6E6FA] text-[#5B4B9C]'
                                            }`}
                                        >
                                            {isArtistDeclined(
                                                selectedBooking,
                                            ) ? (
                                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            ) : (
                                                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            )}
                                            {selectedBooking.artist_message}
                                        </p>
                                    </div>
                                )}

                                {selectedBooking.inspo_url && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#5B6B82]">
                                            Makeup inspo
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setViewingInspoUrl(
                                                    selectedBooking.inspo_url,
                                                )
                                            }
                                            className="flex items-center gap-2 rounded-lg border border-[#95B1DB] bg-[#FAFCFE] p-2 transition hover:bg-[#E6EEF8]"
                                        >
                                            <img
                                                src={selectedBooking.inspo_url}
                                                alt="Inspo"
                                                className="h-12 w-12 rounded-md object-cover"
                                            />
                                            <span className="flex items-center gap-1 text-xs font-semibold text-[#5F83AB]">
                                                <ImageIcon className="h-3.5 w-3.5" />{' '}
                                                View full image
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {canModify(selectedBooking) && (
                                    <div className="flex flex-wrap gap-2 border-t border-[#D3DFEF] pt-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRescheduling(true)
                                            }
                                            className="flex items-center gap-1.5 rounded-full border border-[#5F83AB] px-4 py-1.5 text-xs font-semibold text-[#5F83AB] transition hover:bg-[#E6EEF8]"
                                        >
                                            <CalendarDays className="h-3.5 w-3.5" />{' '}
                                            Reschedule
                                        </button>

                                        {confirmingId === selectedBooking.id ? (
                                            <div className="flex w-full flex-wrap items-center gap-2 pt-2">
                                                <p className="w-full text-sm font-medium text-[#A13F3F]">
                                                    Cancel this booking?
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleCancel(
                                                            selectedBooking.id,
                                                        )
                                                    }
                                                    disabled={
                                                        cancellingId ===
                                                        selectedBooking.id
                                                    }
                                                    className="rounded-full bg-[#A13F3F] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8A3434] disabled:opacity-50"
                                                >
                                                    {cancellingId ===
                                                    selectedBooking.id
                                                        ? 'Cancelling...'
                                                        : 'Yes, cancel it'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmingId(null)
                                                    }
                                                    className="rounded-full border border-[#95B1DB] px-4 py-1.5 text-xs font-semibold text-[#5B6B82] transition hover:bg-[#E6EEF8]"
                                                >
                                                    Never mind
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmingId(
                                                        selectedBooking.id,
                                                    )
                                                }
                                                className="flex items-center gap-1.5 rounded-full border border-[#A13F3F] px-4 py-1.5 text-xs font-semibold text-[#A13F3F] transition hover:bg-[#F5E0E0]"
                                            >
                                                <X className="h-3.5 w-3.5" />{' '}
                                                Cancel booking
                                            </button>
                                        )}
                                    </div>
                                )}

                                {needsContactToCancel(selectedBooking) && (
                                    <div className="border-t border-[#D3DFEF] pt-4">
                                        <p className="text-xs text-[#5B6B82]">
                                            This session is less than{' '}
                                            {CANCEL_CUTOFF_HOURS}h away and can
                                            no longer be changed here.
                                            {selectedBooking.artist.phone
                                                ? ` Please contact ${selectedBooking.artist.name} directly at ${selectedBooking.artist.phone}.`
                                                : ` Please contact ${selectedBooking.artist.name} directly.`}
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="grid gap-4">
                                <p className="text-sm text-[#5B6B82]">
                                    Pick a new date and time. Your artist will
                                    need to approve the new slot.
                                </p>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold text-[#1F2D40]">
                                            New date
                                        </label>
                                        <input
                                            type="date"
                                            value={newDate}
                                            min={todayISO()}
                                            onChange={(e) =>
                                                setNewDate(e.target.value)
                                            }
                                            className="rounded-xl border border-[#95B1DB] bg-[#FAFCFE] px-3 py-2 text-sm text-[#1F2D40] focus-visible:border-[#769AD0] focus-visible:outline-none"
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold text-[#1F2D40]">
                                            New time
                                        </label>
                                        <input
                                            type="time"
                                            value={newTime}
                                            onChange={(e) =>
                                                setNewTime(e.target.value)
                                            }
                                            className="rounded-xl border border-[#95B1DB] bg-[#FAFCFE] px-3 py-2 text-sm text-[#1F2D40] focus-visible:border-[#769AD0] focus-visible:outline-none"
                                        />
                                    </div>
                                </div>

                                {!confirmingReschedule ? (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={!rescheduleChanged}
                                            onClick={handleProceed}
                                            className="rounded-full bg-[#5F83AB] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4E7099] disabled:opacity-40"
                                        >
                                            Proceed
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRescheduling(false)
                                            }
                                            className="rounded-full border border-[#95B1DB] px-5 py-2 text-sm font-semibold text-[#5B6B82] transition hover:bg-[#E6EEF8]"
                                        >
                                            Back
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-[#95B1DB] bg-[#F2F5F8] p-4">
                                        <p className="mb-3 text-sm text-[#1F2D40]">
                                            Reschedule to{' '}
                                            <span className="font-semibold">
                                                {formatDate(newDate)}
                                            </span>{' '}
                                            at{' '}
                                            <span className="font-semibold">
                                                {formatTime(newTime)}
                                            </span>
                                            ? This will need your artist's
                                            approval again.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={rescheduleBusy}
                                                onClick={
                                                    handleConfirmReschedule
                                                }
                                                className="rounded-full bg-[#5F83AB] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4E7099] disabled:opacity-50"
                                            >
                                                {rescheduleBusy
                                                    ? 'Submitting...'
                                                    : 'Confirm'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmingReschedule(
                                                        false,
                                                    )
                                                }
                                                className="rounded-full border border-[#95B1DB] px-5 py-2 text-sm font-semibold text-[#5B6B82] transition hover:bg-[#E6EEF8]"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* inspo fullscreen viewer */}
            {viewingInspoUrl && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setViewingInspoUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingInspoUrl(null)}
                        aria-label="Close"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <img
                        src={viewingInspoUrl}
                        alt="Inspo full view"
                        className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
