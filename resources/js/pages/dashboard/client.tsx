import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarPlus,
    CalendarDays,
    Check,
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
import RequiredAsterisk from '@/components/required-asterisk';

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
    terms_accepted_at?: string | null;
    terms_version?: string | null;
    deposit_status?: 'not_due' | 'due' | 'submitted' | 'received';
    deposit_method?: 'gcash' | 'bank_transfer' | 'cash' | null;
    deposit_reference?: string | null;
    deposit_proof_url?: string | null;
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
    venue_address?: string | null;
    package?: {
        description: string | null;
        inclusions: string[] | null;
    } | null;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    cancelled_by: 'client' | 'artist' | null;
    notes: string | null;
    artist_message: string | null;
    inspo_url: string | null;
    review?: { rating: number; comment: string; is_approved: boolean } | null;
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
    pending: 'bg-[#f4e9e5] text-[#8a6a2f]',
    confirmed: 'bg-[#DFF5E1] text-[#2E7D46]',
    completed: 'bg-[#f4e9e5] text-[#8a6a2f]',
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
    if (!notes) {
        return { occasion: null as string | null, text: '' };
    }

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
    if (booking.status === 'pending') {
        return true;
    }

    if (booking.status === 'confirmed') {
        return hoursUntil(booking) > CANCEL_CUTOFF_HOURS;
    }

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
    const [feeDecisionBusyId, setFeeDecisionBusyId] = useState<number | null>(
        null,
    );
    const [depositReference, setDepositReference] = useState<
        Record<number, string>
    >({});
    const [depositMethod, setDepositMethod] = useState<Record<number, string>>(
        {},
    );
    const [depositProof, setDepositProof] = useState<
        Record<number, File | null>
    >({});
    const [depositErrors, setDepositErrors] = useState<Record<number, string>>(
        {},
    );
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
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [reviewBusy, setReviewBusy] = useState(false);

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

    function handleAcceptQuote(booking: Booking) {
        setFeeDecisionBusyId(booking.id);
        router.patch(
            `/book/${booking.id}/quote/accept`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setFeeDecisionBusyId(null),
            },
        );
    }

    function submitReview(booking: Booking) {
        setReviewBusy(true);
        setReviewError('');
        router.post(
            `/book/${booking.id}/review`,
            { rating: reviewRating, comment: reviewComment },
            {
                preserveScroll: true,
                onError: (errors) =>
                    setReviewError(
                        String(
                            errors.comment ??
                                errors.rating ??
                                'Could not submit your review.',
                        ),
                    ),
                onSuccess: () => setReviewComment(''),
                onFinish: () => setReviewBusy(false),
            },
        );
    }

    function handleSubmitDeposit(booking: Booking) {
        setFeeDecisionBusyId(booking.id);
        setDepositErrors((current) => ({ ...current, [booking.id]: '' }));
        const method = depositMethod[booking.id] ?? '';
        router.patch(
            `/book/${booking.id}/deposit`,
            {
                deposit_method: method,
                deposit_reference: depositReference[booking.id] ?? '',
                deposit_proof:
                    method === 'cash'
                        ? null
                        : (depositProof[booking.id] ?? null),
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) =>
                    setDepositErrors((current) => ({
                        ...current,
                        [booking.id]: String(
                            errors.deposit_method ??
                                errors.deposit_proof ??
                                errors.deposit_reference ??
                                'Could not submit the deposit details.',
                        ),
                    })),
                onFinish: () => setFeeDecisionBusyId(null),
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
        if (!rescheduleChanged) {
            return;
        }

        setConfirmingReschedule(true);
    }

    function handleConfirmReschedule() {
        if (!selectedBooking) {
            return;
        }

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

            <div className="min-h-screen bg-[#faf7f4]">
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
                                            <p className="mt-1 text-sm text-[#4a4a4a]">
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

                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-[#e8d7cf]/50 blur-2xl" />
                        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                            <div>
                                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e8d7cf] bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                    <Sparkles className="h-3.5 w-3.5" /> Your
                                    beauty appointments
                                </span>
                                <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                                    Welcome back,{' '}
                                    {auth?.user?.name?.split(' ')[0] ??
                                        'beautiful'}
                                    !
                                </h1>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                                    Keep up with your sessions and get ready for
                                    your next glow-up.
                                </p>
                            </div>
                            <Link
                                href="/book"
                                className="relative inline-flex items-center justify-center gap-2 self-start rounded-full bg-[#8a6a2f] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#8a6a2f]/25 transition duration-200 hover:-translate-y-0.5 hover:bg-[#8a6a2f] sm:self-auto"
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
                        <div className="rounded-2xl border border-[#e8d7cf] bg-white p-4 shadow-sm shadow-[#c9a66b]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#4a4a4a] uppercase">
                                Coming up
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#8a6a2f]">
                                {upcoming.length}
                            </p>
                            <p className="mt-1 text-xs text-[#4a4a4a]">
                                Upcoming bookings
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#e8d7cf] bg-white p-4 shadow-sm shadow-[#c9a66b]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#4a4a4a] uppercase">
                                Awaiting confirmation
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#8a6a2f]">
                                {pendingCount}
                            </p>
                            <p className="mt-1 text-xs text-[#4a4a4a]">
                                Your artist will confirm soon
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[#e8d7cf] bg-white p-4 shadow-sm shadow-[#c9a66b]/10">
                            <p className="text-xs font-semibold tracking-wider text-[#4a4a4a] uppercase">
                                Favorite moments
                            </p>
                            <p className="mt-2 font-serif text-3xl font-bold text-[#718B72]">
                                {completedCount}
                            </p>
                            <p className="mt-1 text-xs text-[#4a4a4a]">
                                Completed sessions
                            </p>
                        </div>
                    </section>

                    {/* upcoming / past toggle */}
                    <div className="mb-6 inline-flex rounded-full border border-[#e8d7cf] bg-white p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setTab('upcoming')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
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
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
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
                                    ? 'No upcoming bookings'
                                    : 'No past bookings'}
                            </p>
                            <p className="max-w-xs text-sm text-[#4a4a4a]">
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
                                    id={`booking-${booking.id}`}
                                    type="button"
                                    onClick={() => openDetails(booking)}
                                    className={`rounded-3xl border bg-white p-5 text-left shadow-sm shadow-[#c9a66b]/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#c9a66b]/15 sm:p-6 ${
                                        isArtistDeclined(booking)
                                            ? 'border-[#A13F3F]/40'
                                            : 'border-[#e8d7cf]'
                                    }`}
                                >
                                    <div className="mb-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-serif text-lg font-bold text-[#1a1a1a]">
                                                {booking.service}
                                            </p>
                                            {booking.final_makeup_price !=
                                            null ? (
                                                <p className="mt-1 text-sm font-semibold text-[#8a6a2f]">
                                                    Final makeup quote: ₱
                                                    {Number(
                                                        booking.final_makeup_price,
                                                    ).toLocaleString('en-PH')}
                                                </p>
                                            ) : (
                                                booking.base_price_type && (
                                                    <p className="mt-1 text-sm font-semibold text-[#8a6a2f]">
                                                        {booking.requires_quote ||
                                                        booking.base_price_type ===
                                                            'quote_required'
                                                            ? 'Artist quote in progress'
                                                            : `${booking.base_price_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(booking.base_price ?? 0).toLocaleString('en-PH')}`}
                                                    </p>
                                                )
                                            )}
                                            <p className="text-sm text-[#4a4a4a]">
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

                                    {!!booking.selected_add_ons?.length && (
                                        <p className="mb-3 text-xs text-[#4a4a4a]">
                                            Add-ons:{' '}
                                            {booking.selected_add_ons
                                                .map(
                                                    (item) =>
                                                        `${item.name} × ${item.quantity}${item.line_total == null ? '' : ` (₱${Number(item.line_total).toLocaleString('en-PH')})`}`,
                                                )
                                                .join(', ')}
                                        </p>
                                    )}
                                    {booking.venue_address && (
                                        <p className="mb-3 text-sm text-[#4a4a4a]">
                                            Home service ·{' '}
                                            {booking.location_type ===
                                            'nearby_province'
                                                ? 'Nearby province'
                                                : 'Metro Manila'}{' '}
                                            · {booking.venue_address}
                                        </p>
                                    )}
                                    {booking.estimated_total != null && (
                                        <p className="mb-3 text-sm font-semibold text-[#1a1a1a]">
                                            {booking.quote_accepted_at
                                                ? 'Final quoted total'
                                                : booking.quote_pending ||
                                                    booking.transportation_fee_pending
                                                  ? 'Quote total for your approval'
                                                  : 'Starting estimate'}
                                            : ₱
                                            {Number(
                                                booking.estimated_total,
                                            ).toLocaleString('en-PH')}
                                        </p>
                                    )}
                                    {(booking.quote_pending ||
                                        booking.transportation_fee_pending) && (
                                        <p className="mb-3 rounded-xl border border-[#c9a66b] bg-[#fffcf8] px-3 py-2 text-sm font-semibold text-[#8a6a2f]">
                                            Your itemized final quote is ready
                                            to review
                                        </p>
                                    )}
                                    {booking.deposit_status === 'due' &&
                                        booking.estimated_total != null && (
                                            <p className="mb-3 text-sm font-semibold text-[#8a6a2f]">
                                                50% deposit to secure: ₱
                                                {(
                                                    Number(
                                                        booking.estimated_total,
                                                    ) / 2
                                                ).toLocaleString('en-PH', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </p>
                                        )}

                                    <div className="flex flex-wrap gap-4 text-sm text-[#4a4a4a]">
                                        <span className="flex items-center gap-1.5">
                                            <MapPin className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                            {formatDate(booking.booking_date)}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                            {formatTime(booking.booking_time)}
                                        </span>
                                    </div>

                                    {booking.artist_message && (
                                        <p
                                            className={`mt-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm ${
                                                isArtistDeclined(booking)
                                                    ? 'bg-[#FDEDED] text-[#A13F3F]'
                                                    : 'bg-[#f4e9e5] text-[#8a6a2f]'
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

                                    <p className="mt-3 text-xs font-semibold text-[#8a6a2f]">
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
                                <p className="mb-0.5 text-xs tracking-widest text-[#8a6a2f] uppercase">
                                    Booking Details
                                </p>
                                <h2 className="font-serif text-xl font-bold text-[#1a1a1a]">
                                    {selectedBooking.service}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetails}
                                aria-label="Close"
                                className="rounded-full p-1.5 text-[#4a4a4a] transition hover:bg-[#f4e9e5] hover:text-[#8a6a2f]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm text-[#4a4a4a]">
                                with{' '}
                                <span className="font-semibold text-[#1a1a1a]">
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

                        {selectedBooking.terms_accepted_at && (
                            <p className="mt-2 text-xs text-[#4a4a4a]">
                                Booking terms accepted on{' '}
                                {new Date(
                                    selectedBooking.terms_accepted_at,
                                ).toLocaleString('en-PH')}
                                .
                            </p>
                        )}

                        {selectedBooking.status === 'completed' &&
                            (selectedBooking.review ? (
                                <section className="mb-4 rounded-xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                    <p className="font-semibold text-[#1a1a1a]">
                                        Your review ·{' '}
                                        {'★'.repeat(
                                            selectedBooking.review.rating,
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-[#4a4a4a]">
                                        {selectedBooking.review.comment}
                                    </p>
                                    <p className="mt-2 text-xs text-[#8a6a2f]">
                                        {selectedBooking.review.is_approved
                                            ? 'Published on the homepage'
                                            : 'Waiting for Trixie’s approval'}
                                    </p>
                                </section>
                            ) : (
                                <section className="mb-4 rounded-xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                    <h3 className="text-sm font-semibold text-[#1a1a1a]">
                                        How was your glam session?
                                    </h3>
                                    <label
                                        htmlFor={`review-rating-${selectedBooking.id}`}
                                        className="mt-3 block text-xs font-medium text-[#4a4a4a]"
                                    >
                                        Your rating<RequiredAsterisk />
                                    </label>
                                    <select
                                        id={`review-rating-${selectedBooking.id}`}
                                        value={reviewRating}
                                        onChange={(event) =>
                                            setReviewRating(
                                                Number(event.target.value),
                                            )
                                        }
                                        required
                                        className="mt-1 w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a2f]"
                                    >
                                        <option value={5}>
                                            ★★★★★ — Loved it
                                        </option>
                                        <option value={4}>★★★★☆ — Great</option>
                                        <option value={3}>★★★☆☆ — Good</option>
                                        <option value={2}>
                                            ★★☆☆☆ — Could be better
                                        </option>
                                        <option value={1}>
                                            ★☆☆☆☆ — Not for me
                                        </option>
                                    </select>
                                    <label
                                        htmlFor={`review-comment-${selectedBooking.id}`}
                                        className="mt-3 block text-xs font-medium text-[#4a4a4a]"
                                    >
                                        Your review<RequiredAsterisk />
                                    </label>
                                    <textarea
                                        id={`review-comment-${selectedBooking.id}`}
                                        value={reviewComment}
                                        onChange={(event) =>
                                            setReviewComment(event.target.value)
                                        }
                                        minLength={10}
                                        maxLength={1200}
                                        required
                                        rows={3}
                                        placeholder="Share a little about your experience (10–1,200 characters)"
                                        className="mt-1 w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] opacity-100 placeholder:text-[#6b625a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a2f]"
                                    />
                                    <p className="mt-1 text-xs text-[#6b625a]">
                                        Trixie reviews each submission before it
                                        appears publicly.
                                    </p>
                                    {reviewError && (
                                        <p
                                            role="alert"
                                            className="mt-1 text-xs text-[#A13F3F]"
                                        >
                                            {reviewError}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        disabled={
                                            reviewBusy ||
                                            reviewComment.trim().length < 10
                                        }
                                        onClick={() =>
                                            submitReview(selectedBooking)
                                        }
                                        className="mt-3 rounded-full bg-[#8a6a2f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                        {reviewBusy
                                            ? 'Submitting…'
                                            : 'Submit review'}
                                    </button>
                                </section>
                            ))}

                        {!rescheduling ? (
                            <>
                                <div className="mb-4 grid gap-2 rounded-xl bg-[#faf7f4] p-4 text-sm text-[#1a1a1a]">
                                    <span className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                        {formatDate(
                                            selectedBooking.booking_date,
                                        )}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                        {formatTime(
                                            selectedBooking.booking_time,
                                        )}
                                    </span>
                                    {selectedBooking.artist.phone && (
                                        <span className="flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                            {selectedBooking.artist.phone}
                                        </span>
                                    )}
                                </div>

                                {(selectedBooking.base_price != null ||
                                    selectedBooking.final_makeup_price !=
                                        null ||
                                    !!selectedBooking.selected_add_ons
                                        ?.length ||
                                    selectedBooking.estimated_total !=
                                        null) && (
                                    <section className="mb-4 rounded-xl border border-[#e8d7cf] bg-white p-4">
                                        <h3 className="mb-3 text-sm font-semibold text-[#1a1a1a]">
                                            Price breakdown
                                        </h3>
                                        <div className="grid gap-2 text-sm text-[#4a4a4a]">
                                            {selectedBooking.final_makeup_price !=
                                            null ? (
                                                <div className="flex justify-between gap-3">
                                                    <span>
                                                        Final makeup price
                                                    </span>
                                                    <span className="shrink-0">
                                                        ₱
                                                        {Number(
                                                            selectedBooking.final_makeup_price,
                                                        ).toLocaleString(
                                                            'en-PH',
                                                        )}
                                                    </span>
                                                </div>
                                            ) : (
                                                selectedBooking.base_price !=
                                                    null && (
                                                    <div className="flex justify-between gap-3">
                                                        <span>
                                                            {
                                                                selectedBooking.service
                                                            }
                                                            {selectedBooking.base_price_type ===
                                                            'starting_at'
                                                                ? ' (starting price)'
                                                                : ''}
                                                        </span>
                                                        <span className="shrink-0">
                                                            {selectedBooking.base_price_type ===
                                                            'quote_required'
                                                                ? 'Quote'
                                                                : `₱${Number(selectedBooking.base_price).toLocaleString('en-PH')}`}
                                                        </span>
                                                    </div>
                                                )
                                            )}
                                            {selectedBooking.selected_add_ons?.map(
                                                (item, index) => (
                                                    <div
                                                        key={`${item.name}-${index}`}
                                                        className="flex justify-between gap-3"
                                                    >
                                                        <span>
                                                            {item.name}
                                                            {item.quantity > 1
                                                                ? ` × ${item.quantity}`
                                                                : ''}
                                                        </span>
                                                        <span className="shrink-0">
                                                            {item.line_total ==
                                                            null
                                                                ? 'Quote'
                                                                : `₱${Number(item.line_total).toLocaleString('en-PH')}`}
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                            {selectedBooking.estimated_total !=
                                                null && (
                                                <div className="flex justify-between gap-3 border-t border-[#e8d7cf] pt-2 font-semibold text-[#1a1a1a]">
                                                    <span>
                                                        {selectedBooking.quote_accepted_at
                                                            ? 'Final quoted total'
                                                            : selectedBooking.quote_pending ||
                                                                selectedBooking.transportation_fee_pending
                                                              ? 'Total for your approval'
                                                              : 'Starting estimate'}
                                                    </span>
                                                    <span className="shrink-0">
                                                        ₱
                                                        {Number(
                                                            selectedBooking.estimated_total,
                                                        ).toLocaleString(
                                                            'en-PH',
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {selectedBooking.quote_reason && (
                                    <section className="mb-4 rounded-xl bg-[#faf7f4] p-4">
                                        <h3 className="text-sm font-semibold text-[#1a1a1a]">
                                            Artist&apos;s quote note
                                        </h3>
                                        <p className="mt-1 text-sm whitespace-pre-line text-[#4a4a4a]">
                                            {selectedBooking.quote_reason}
                                        </p>
                                    </section>
                                )}

                                {(selectedBooking.quote_pending ||
                                    selectedBooking.transportation_fee_pending) && (
                                    <section className="mb-4 rounded-xl border border-[#c9a66b] bg-[#fffcf8] p-4">
                                        <p className="text-sm font-semibold text-[#1a1a1a]">
                                            Review your final quote
                                        </p>
                                        <p className="mt-1 text-sm text-[#4a4a4a]">
                                            This quote includes the final makeup
                                            price and transportation fee. Accept
                                            it to continue to the 50% deposit,
                                            or cancel the request if the total
                                            does not work for you.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={
                                                feeDecisionBusyId ===
                                                selectedBooking.id
                                            }
                                            onClick={() =>
                                                handleAcceptQuote(
                                                    selectedBooking,
                                                )
                                            }
                                            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#8a6a2f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6f5325] disabled:opacity-50"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            {feeDecisionBusyId ===
                                            selectedBooking.id
                                                ? 'Saving...'
                                                : 'Accept quote'}
                                        </button>
                                    </section>
                                )}

                                {selectedBooking.deposit_status === 'due' &&
                                    selectedBooking.estimated_total != null && (
                                        <section className="mb-4 rounded-xl border border-[#c9a66b] bg-[#fffcf8] p-4">
                                            <p className="text-sm font-semibold text-[#1a1a1a]">
                                                50% deposit: ₱
                                                {(
                                                    Number(
                                                        selectedBooking.estimated_total,
                                                    ) / 2
                                                ).toLocaleString('en-PH', {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </p>
                                            <p className="mt-1 text-sm leading-5 text-[#4a4a4a]">
                                                Choose how you paid. Upload a
                                                screenshot or photo of the
                                                successful transaction for GCash
                                                or bank transfer so Trixie can
                                                verify the deposit.
                                            </p>
                                            <label
                                                htmlFor={`deposit-method-${selectedBooking.id}`}
                                                className="mt-3 block text-xs font-medium text-[#4a4a4a]"
                                            >
                                                Payment method<RequiredAsterisk />
                                            </label>
                                            <select
                                                id={`deposit-method-${selectedBooking.id}`}
                                                value={
                                                    depositMethod[
                                                        selectedBooking.id
                                                    ] ?? ''
                                                }
                                                onChange={(event) => {
                                                    const method =
                                                        event.target.value;
                                                    setDepositMethod(
                                                        (current) => ({
                                                            ...current,
                                                            [selectedBooking.id]:
                                                                method,
                                                        }),
                                                    );

                                                    if (method === 'cash') {
                                                        setDepositProof(
                                                            (current) => ({
                                                                ...current,
                                                                [selectedBooking.id]:
                                                                    null,
                                                            }),
                                                        );
                                                    }
                                                }}
                                                className="mt-1 w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30 focus-visible:outline-none"
                                            >
                                                <option value="">
                                                    Choose a payment method
                                                </option>
                                                <option value="gcash">
                                                    GCash
                                                </option>
                                                <option value="bank_transfer">
                                                    Bank transfer
                                                </option>
                                                <option value="cash">
                                                    Cash
                                                </option>
                                            </select>
                                            <label
                                                htmlFor={`deposit-reference-${selectedBooking.id}`}
                                                className="mt-3 block text-xs font-medium text-[#4a4a4a]"
                                            >
                                                Payment reference or note
                                            </label>
                                            <input
                                                id={`deposit-reference-${selectedBooking.id}`}
                                                value={
                                                    depositReference[
                                                        selectedBooking.id
                                                    ] ?? ''
                                                }
                                                onChange={(event) =>
                                                    setDepositReference(
                                                        (current) => ({
                                                            ...current,
                                                            [selectedBooking.id]:
                                                                event.target
                                                                    .value,
                                                        }),
                                                    )
                                                }
                                                maxLength={120}
                                                placeholder="Optional transaction reference"
                                                className="mt-1 w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30 focus-visible:outline-none"
                                            />
                                            {(depositMethod[
                                                selectedBooking.id
                                            ] === 'gcash' ||
                                                depositMethod[
                                                    selectedBooking.id
                                                ] === 'bank_transfer') && (
                                                <>
                                                    <label
                                                        htmlFor={`deposit-proof-${selectedBooking.id}`}
                                                        className="mt-3 block text-xs font-medium text-[#4a4a4a]"
                                                    >
                                                        Upload payment proof
                                                        (JPG, PNG, or WebP; up
                                                        to 5 MB)<RequiredAsterisk />
                                                    </label>
                                                    <input
                                                        id={`deposit-proof-${selectedBooking.id}`}
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        onChange={(event) =>
                                                            setDepositProof(
                                                                (current) => ({
                                                                    ...current,
                                                                    [selectedBooking.id]:
                                                                        event
                                                                            .target
                                                                            .files?.[0] ??
                                                                        null,
                                                                }),
                                                            )
                                                        }
                                                        className="mt-1 w-full text-sm text-[#4a4a4a] file:mr-3 file:rounded-full file:border-0 file:bg-[#f4e9e5] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[#8a6a2f]"
                                                    />
                                                </>
                                            )}
                                            {depositErrors[
                                                selectedBooking.id
                                            ] && (
                                                <p
                                                    role="alert"
                                                    className="mt-1 text-xs text-[#A13F3F]"
                                                >
                                                    {
                                                        depositErrors[
                                                            selectedBooking.id
                                                        ]
                                                    }
                                                </p>
                                            )}
                                            <button
                                                type="button"
                                                disabled={
                                                    feeDecisionBusyId ===
                                                        selectedBooking.id ||
                                                    !depositMethod[
                                                        selectedBooking.id
                                                    ] ||
                                                    (depositMethod[
                                                        selectedBooking.id
                                                    ] !== 'cash' &&
                                                        !depositProof[
                                                            selectedBooking.id
                                                        ])
                                                }
                                                onClick={() =>
                                                    handleSubmitDeposit(
                                                        selectedBooking,
                                                    )
                                                }
                                                className="mt-3 rounded-full bg-[#8a6a2f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6f5325] disabled:opacity-50"
                                            >
                                                {feeDecisionBusyId ===
                                                selectedBooking.id
                                                    ? 'Submitting…'
                                                    : 'I sent the deposit'}
                                            </button>
                                        </section>
                                    )}
                                {selectedBooking.deposit_status ===
                                    'submitted' && (
                                    <section className="mb-4 rounded-xl border border-[#c9a66b] bg-[#fffcf8] p-4 text-sm">
                                        <p className="font-semibold text-[#1a1a1a]">
                                            Deposit marked as sent
                                        </p>
                                        <p className="mt-1 text-[#4a4a4a]">
                                            Trixie will verify your{' '}
                                            {selectedBooking.deposit_method?.replace(
                                                '_',
                                                ' ',
                                            )}{' '}
                                            payment
                                            {selectedBooking.deposit_reference
                                                ? ` · Reference: ${selectedBooking.deposit_reference}`
                                                : ''}
                                            .
                                        </p>
                                        {selectedBooking.deposit_proof_url && (
                                            <img
                                                src={
                                                    selectedBooking.deposit_proof_url
                                                }
                                                alt="Uploaded deposit payment proof"
                                                className="mt-3 max-h-64 rounded-xl border border-[#e8d7cf] object-contain"
                                            />
                                        )}
                                    </section>
                                )}
                                {selectedBooking.deposit_status ===
                                    'received' && (
                                    <section className="mb-4 rounded-xl border border-[#b7d5bb] bg-[#f1f7f1] p-4 text-sm text-[#426948]">
                                        <p className="font-semibold">
                                            50% deposit received
                                        </p>
                                        <p className="mt-1">
                                            Trixie will confirm your booking
                                            shortly.
                                        </p>
                                    </section>
                                )}

                                {selectedBooking.package && (
                                    <section className="mb-4 rounded-xl bg-[#fffcf8] p-4">
                                        <h3 className="mb-2 text-sm font-semibold text-[#1a1a1a]">
                                            Package details
                                        </h3>
                                        {selectedBooking.package
                                            .description && (
                                            <p className="mb-2 text-sm text-[#4a4a4a]">
                                                {
                                                    selectedBooking.package
                                                        .description
                                                }
                                            </p>
                                        )}
                                        {!!selectedBooking.package.inclusions
                                            ?.length && (
                                            <ul className="grid gap-1 text-sm text-[#4a4a4a]">
                                                {selectedBooking.package.inclusions.map(
                                                    (inclusion, index) => (
                                                        <li
                                                            key={`${inclusion}-${index}`}
                                                        >
                                                            • {inclusion}
                                                        </li>
                                                    ),
                                                )}
                                            </ul>
                                        )}
                                    </section>
                                )}

                                {selectedBooking.venue_address && (
                                    <section className="mb-4 rounded-xl bg-[#faf7f4] p-4 text-sm">
                                        <h3 className="mb-1 font-semibold text-[#1a1a1a]">
                                            Home-service location
                                        </h3>
                                        <p className="text-[#4a4a4a]">
                                            {selectedBooking.location_type ===
                                            'nearby_province'
                                                ? 'Nearby province'
                                                : selectedBooking.location_type ===
                                                    'metro_manila'
                                                  ? 'Metro Manila'
                                                  : 'Home service'}
                                        </p>
                                        <p className="mt-1 whitespace-pre-line text-[#1a1a1a]">
                                            {selectedBooking.venue_address}
                                        </p>
                                    </section>
                                )}

                                {selectedNotes.occasion && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#4a4a4a]">
                                            Occasion
                                        </p>
                                        <span className="inline-block rounded-full bg-[#f4e9e5] px-3 py-1 text-xs font-semibold text-[#8a6a2f]">
                                            {selectedNotes.occasion}
                                        </span>
                                    </div>
                                )}

                                {selectedNotes.text && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#4a4a4a]">
                                            Your notes
                                        </p>
                                        <p className="rounded-lg bg-[#faf7f4] px-3 py-2 text-sm whitespace-pre-line text-[#1a1a1a]">
                                            {selectedNotes.text}
                                        </p>
                                    </div>
                                )}

                                {selectedBooking.artist_message && (
                                    <div className="mb-4">
                                        <p className="mb-1 text-xs font-semibold text-[#4a4a4a]">
                                            Message from{' '}
                                            {selectedBooking.artist.name}
                                        </p>
                                        <p
                                            className={`flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm ${
                                                isArtistDeclined(
                                                    selectedBooking,
                                                )
                                                    ? 'bg-[#FDEDED] text-[#A13F3F]'
                                                    : 'bg-[#f4e9e5] text-[#8a6a2f]'
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
                                        <p className="mb-1 text-xs font-semibold text-[#4a4a4a]">
                                            Makeup inspo
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setViewingInspoUrl(
                                                    selectedBooking.inspo_url,
                                                )
                                            }
                                            className="flex items-center gap-2 rounded-lg border border-[#c9a66b] bg-[#fffcf8] p-2 transition hover:bg-[#f4e9e5]"
                                        >
                                            <img
                                                src={selectedBooking.inspo_url}
                                                alt="Inspo"
                                                className="h-12 w-12 rounded-md object-cover"
                                            />
                                            <span className="flex items-center gap-1 text-xs font-semibold text-[#8a6a2f]">
                                                <ImageIcon className="h-3.5 w-3.5" />{' '}
                                                View full image
                                            </span>
                                        </button>
                                    </div>
                                )}

                                {canModify(selectedBooking) && (
                                    <div className="flex flex-wrap gap-2 border-t border-[#e8d7cf] pt-4">
                                        {!selectedBooking.transportation_fee_pending &&
                                            !selectedBooking.quote_pending && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setRescheduling(true)
                                                    }
                                                    className="flex items-center gap-1.5 rounded-full border border-[#8a6a2f] px-4 py-1.5 text-xs font-semibold text-[#8a6a2f] transition hover:bg-[#f4e9e5]"
                                                >
                                                    <CalendarDays className="h-3.5 w-3.5" />{' '}
                                                    Reschedule
                                                </button>
                                            )}

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
                                                    className="rounded-full border border-[#c9a66b] px-4 py-1.5 text-xs font-semibold text-[#4a4a4a] transition hover:bg-[#f4e9e5]"
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
                                    <div className="border-t border-[#e8d7cf] pt-4">
                                        <p className="text-xs text-[#4a4a4a]">
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
                                <p className="text-sm text-[#4a4a4a]">
                                    Pick a new date and time. Your artist will
                                    need to approve the new slot.
                                </p>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold text-[#1a1a1a]">
                                            New date<RequiredAsterisk />
                                        </label>
                                        <input
                                            type="date"
                                            value={newDate}
                                            min={todayISO()}
                                            onChange={(e) =>
                                                setNewDate(e.target.value)
                                            }
                                            className="rounded-xl border border-[#c9a66b] bg-[#fffcf8] px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:outline-none"
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <label className="text-xs font-semibold text-[#1a1a1a]">
                                            New time<RequiredAsterisk />
                                        </label>
                                        <input
                                            type="time"
                                            value={newTime}
                                            onChange={(e) =>
                                                setNewTime(e.target.value)
                                            }
                                            className="rounded-xl border border-[#c9a66b] bg-[#fffcf8] px-3 py-2 text-sm text-[#1a1a1a] focus-visible:border-[#8a6a2f] focus-visible:outline-none"
                                        />
                                    </div>
                                </div>

                                {!confirmingReschedule ? (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={!rescheduleChanged}
                                            onClick={handleProceed}
                                            className="rounded-full bg-[#8a6a2f] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#735829] disabled:opacity-40"
                                        >
                                            Proceed
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRescheduling(false)
                                            }
                                            className="rounded-full border border-[#c9a66b] px-5 py-2 text-sm font-semibold text-[#4a4a4a] transition hover:bg-[#f4e9e5]"
                                        >
                                            Back
                                        </button>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-[#c9a66b] bg-[#faf7f4] p-4">
                                        <p className="mb-3 text-sm text-[#1a1a1a]">
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
                                                className="rounded-full bg-[#8a6a2f] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#735829] disabled:opacity-50"
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
                                                className="rounded-full border border-[#c9a66b] px-5 py-2 text-sm font-semibold text-[#4a4a4a] transition hover:bg-[#f4e9e5]"
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
