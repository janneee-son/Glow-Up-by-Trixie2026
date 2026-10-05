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
    pending: 'bg-[#FCE4EC] text-[#B9426A]',
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
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
    return m ? { occasion: m[1], text: notes.slice(m[0].length).trim() } : { occasion: null, text: notes };
}

function appointmentDate(booking: Booking) {
    return new Date(`${booking.booking_date}T${booking.booking_time}`);
}

function isPast(booking: Booking) {
    return appointmentDate(booking).getTime() < Date.now() || booking.status === 'completed' || booking.status === 'cancelled';
}

function hoursUntil(booking: Booking) {
    return (appointmentDate(booking).getTime() - Date.now()) / (1000 * 60 * 60);
}

/** Same rule governs both self-cancel and reschedule eligibility. */
function canModify(booking: Booking) {
    if (booking.status === 'pending') return true;
    if (booking.status === 'confirmed') return hoursUntil(booking) > CANCEL_CUTOFF_HOURS;
    return false;
}

function needsContactToCancel(booking: Booking) {
    return booking.status === 'confirmed' && hoursUntil(booking) <= CANCEL_CUTOFF_HOURS && hoursUntil(booking) > 0;
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
    const { auth } = usePage<{ auth?: { user?: { name?: string; role?: 'client' | 'artist' | 'admin' } } }>().props;
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [dismissed, setDismissed] = useState<number[]>(() => (typeof window !== 'undefined' ? getDismissedIds() : []));

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
        () => bookings.filter((b) => isArtistDeclined(b) && !dismissed.includes(b.id)),
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
        selectedBooking && (newDate !== selectedBooking.booking_date || newTime !== selectedBooking.booking_time);

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

            <div className="min-h-screen bg-[#FFF5F7]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="dashboard"
                />

                <div className="mx-auto max-w-3xl px-6 py-10 md:px-12">
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
                                            {booking.artist.name} declined your {booking.service} booking
                                            {' · '}
                                            {formatDate(booking.booking_date)}
                                        </p>
                                        {booking.artist_message && (
                                            <p className="mt-1 text-sm text-[#7A5560]">"{booking.artist_message}"</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDismiss(booking.id)}
                                        aria-label="Dismiss"
                                        className="shrink-0 text-[#A13F3F] transition hover:text-[#8A3434]"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                        <div>
                            <p className="mb-1 text-xs uppercase tracking-widest text-[#E75480]">My Bookings</p>
                            <h1 className="font-serif text-3xl font-bold text-[#4A2C33]">Welcome back!</h1>
                        </div>
                        <Link
                            href="/book"
                            className="inline-flex items-center gap-2 rounded-full bg-[#E75480] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#F3A6C0]/50 transition duration-200 hover:bg-[#D63F6E]"
                        >
                            <CalendarPlus className="h-4 w-4" /> Book a New Session
                        </Link>
                    </div>

                    {/* upcoming / past toggle */}
                    <div className="mb-6 inline-flex rounded-full border border-[#F3A6C0] bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setTab('upcoming')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                                tab === 'upcoming' ? 'bg-[#E75480] text-white' : 'text-[#7A5560] hover:text-[#E75480]'
                            }`}
                        >
                            Upcoming ({upcoming.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('past')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                                tab === 'past' ? 'bg-[#E75480] text-white' : 'text-[#7A5560] hover:text-[#E75480]'
                            }`}
                        >
                            Past ({past.length})
                        </button>
                    </div>

                    {visible.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#F7C6D9] bg-white px-6 py-16 text-center">
                            <Sparkles className="h-8 w-8 text-[#F3A6C0]" />
                            <p className="font-semibold text-[#4A2C33]">
                                {tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
                            </p>
                            <p className="max-w-xs text-sm text-[#7A5560]">
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
                                    className={`rounded-2xl border bg-white p-5 text-left transition duration-200 hover:shadow-md hover:shadow-[#F3A6C0]/30 ${
                                        isArtistDeclined(booking) ? 'border-[#A13F3F]/40' : 'border-[#F7C6D9]'
                                    }`}
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-serif text-lg font-bold text-[#4A2C33]">{booking.service}</p>
                                            <p className="text-sm text-[#7A5560]">
                                                with {booking.artist.name}
                                                {booking.artist.specialty ? ` · ${booking.artist.specialty}` : ''}
                                            </p>
                                        </div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[booking.status]}`}
                                        >
                                            {isArtistDeclined(booking) ? 'Declined' : booking.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-[#7A5560]">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-[#E75480]" /> {formatDate(booking.booking_date)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-[#E75480]" /> {formatTime(booking.booking_time)}
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
                                                <span className="font-semibold">{booking.artist.name}:</span> {booking.artist_message}
                                            </span>
                                        </p>
                                    )}

                                    <p className="mt-3 text-xs font-semibold text-[#E75480]">Tap for details →</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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
                                <p className="mb-0.5 text-xs uppercase tracking-widest text-[#E75480]">Booking Details</p>
                                <h2 className="font-serif text-xl font-bold text-[#4A2C33]">{selectedBooking.service}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetails}
                                aria-label="Close"
                                className="rounded-full p-1.5 text-[#7A5560] transition hover:bg-[#FCE4EC] hover:text-[#E75480]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-[#7A5560]">
                                with <span className="font-semibold text-[#4A2C33]">{selectedBooking.artist.name}</span>
                                {selectedBooking.artist.specialty ? ` · ${selectedBooking.artist.specialty}` : ''}
                            </p>
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[selectedBooking.status]}`}
                            >
                                {isArtistDeclined(selectedBooking) ? 'Declined' : selectedBooking.status}
                            </span>
                        </div>

                        {!rescheduling ? (
                            <>
                                <div className="mb-4 grid gap-2 rounded-xl bg-[#FFF5F7] p-4 text-sm text-[#4A2C33]">
                                    <span className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-[#E75480]" /> {formatDate(selectedBooking.booking_date)}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-[#E75480]" /> {formatTime(selectedBooking.booking_time)}
                                    </span>
                                    {selectedBooking.artist.phone && (
                                        <span className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-[#E75480]" /> {selectedBooking.artist.phone}
                                        </span>
                                    )}
                                </div>

                                {selectedNotes.occasion && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#7A5560]">Occasion</p>
                                        <span className="inline-block rounded-full bg-[#FCE4EC] px-3 py-1 text-xs font-semibold text-[#E75480]">
                                            {selectedNotes.occasion}
                                        </span>
                                    </div>
                                )}

                                {selectedNotes.text && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#7A5560]">Your notes</p>
                                        <p className="whitespace-pre-line rounded-lg bg-[#FFF5F7] px-3 py-2 text-sm text-[#4A2C33]">
                                            {selectedNotes.text}
                                        </p>
                                    </div>
                                )}

                                {selectedBooking.artist_message && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#7A5560]">
                                            Message from {selectedBooking.artist.name}
                                        </p>
                                        <p
                                            className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm ${
                                                isArtistDeclined(selectedBooking)
                                                    ? 'bg-[#FDEDED] text-[#A13F3F]'
                                                    : 'bg-[#E6E6FA] text-[#5B4B9C]'
                                            }`}
                                        >
                                            {isArtistDeclined(selectedBooking) ? (
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
                                        <p className="mb-1 text-xs font-semibold text-[#7A5560]">Makeup inspo</p>
                                        <button
                                            type="button"
                                            onClick={() => setViewingInspoUrl(selectedBooking.inspo_url)}
                                            className="flex items-center gap-2 rounded-lg border border-[#F3A6C0] bg-[#FFFAFB] p-2 transition hover:bg-[#FCE4EC]"
                                        >
                                            <img
                                                src={selectedBooking.inspo_url}
                                                alt="Inspo"
                                                className="h-12 w-12 rounded-md object-cover"
                                            />
                                            <span className="flex items-center gap-1 text-xs font-semibold text-[#E75480]">
                                                <ImageIcon className="h-3.5 w-3.5" /> View full image
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {canModify(selectedBooking) && (
                                    <div className="flex flex-wrap gap-2 border-t border-[#F7C6D9] pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setRescheduling(true)}
                                            className="flex items-center gap-1.5 rounded-full border border-[#E75480] px-4 py-1.5 text-xs font-semibold text-[#E75480] transition hover:bg-[#FCE4EC]"
                                        >
                                            <CalendarDays className="h-3.5 w-3.5" /> Reschedule
                                        </button>

                                        {confirmingId === selectedBooking.id ? (
                                            <div className="flex w-full flex-wrap items-center gap-2 pt-2">
                                                <p className="w-full text-sm font-medium text-[#A13F3F]">Cancel this booking?</p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancel(selectedBooking.id)}
                                                    disabled={cancellingId === selectedBooking.id}
                                                    className="rounded-full bg-[#A13F3F] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#8A3434] disabled:opacity-50"
                                                >
                                                    {cancellingId === selectedBooking.id ? 'Cancelling...' : 'Yes, cancel it'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingId(null)}
                                                    className="rounded-full border border-[#F3A6C0] px-4 py-1.5 text-xs font-semibold text-[#7A5560] transition hover:bg-[#FCE4EC]"
                                                >
                                                    Never mind
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingId(selectedBooking.id)}
                                                className="flex items-center gap-1.5 rounded-full border border-[#A13F3F] px-4 py-1.5 text-xs font-semibold text-[#A13F3F] transition hover:bg-[#F5E0E0]"
                                            >
                                                <X className="h-3.5 w-3.5" /> Cancel booking
                                            </button>
                                        )}
                                    </div>
                                )}

                                {needsContactToCancel(selectedBooking) && (
                                    <div className="border-t border-[#F7C6D9] pt-4">
                                        <p className="text-xs text-[#7A5560]">
                                            This session is less than {CANCEL_CUTOFF_HOURS}h away and can no longer be changed here.
                                            {selectedBooking.artist.phone
                                                ? ` Please contact ${selectedBooking.artist.name} directly at ${selectedBooking.artist.phone}.`
                                                : ` Please contact ${selectedBooking.artist.name} directly.`}
                                        </p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="grid gap-4">
                                <p className="text-sm text-[#7A5560]">
                                    Pick a new date and time. Your artist will need to approve the new slot.
                                </p>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold text-[#4A2C33]">New date</label>
                                        <input
                                            type="date"
                                            value={newDate}
                                            min={todayISO()}
                                            onChange={(e) => setNewDate(e.target.value)}
                                            className="rounded-xl border border-[#F3A6C0] bg-[#FFFAFB] px-3 py-2 text-sm text-[#4A2C33] focus-visible:border-[#E75480] focus-visible:outline-none"
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold text-[#4A2C33]">New time</label>
                                        <input
                                            type="time"
                                            value={newTime}
                                            onChange={(e) => setNewTime(e.target.value)}
                                            className="rounded-xl border border-[#F3A6C0] bg-[#FFFAFB] px-3 py-2 text-sm text-[#4A2C33] focus-visible:border-[#E75480] focus-visible:outline-none"
                                        />
                                    </div>
                                </div>

                                {!confirmingReschedule ? (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={!rescheduleChanged}
                                            onClick={handleProceed}
                                            className="rounded-full bg-[#E75480] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#D63F6E] disabled:opacity-40"
                                        >
                                            Proceed
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRescheduling(false)}
                                            className="rounded-full border border-[#F3A6C0] px-5 py-2 text-sm font-semibold text-[#7A5560] transition hover:bg-[#FCE4EC]"
                                        >
                                            Back
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-[#F3A6C0] bg-[#FFF5F7] p-4">
                                        <p className="mb-3 text-sm text-[#4A2C33]">
                                            Reschedule to <span className="font-semibold">{formatDate(newDate)}</span> at{' '}
                                            <span className="font-semibold">{formatTime(newTime)}</span>? This will need your
                                            artist's approval again.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={rescheduleBusy}
                                                onClick={handleConfirmReschedule}
                                                className="rounded-full bg-[#E75480] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#D63F6E] disabled:opacity-50"
                                            >
                                                {rescheduleBusy ? 'Submitting...' : 'Confirm'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmingReschedule(false)}
                                                className="rounded-full border border-[#F3A6C0] px-5 py-2 text-sm font-semibold text-[#7A5560] transition hover:bg-[#FCE4EC]"
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
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
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
