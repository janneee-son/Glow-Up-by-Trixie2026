import { Head, router, usePage } from '@inertiajs/react';
import { Check, Clock, ImageIcon, MapPin, MessageSquare, Phone, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';

type Booking = {
    id: number;
    service: string;
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
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** Splits saved notes into the "Occasion: X" first line and the client's own text. */
function splitNotes(notes: string | null) {
    if (!notes) return { occasion: null as string | null, text: '' };
    const m = notes.match(/^Occasion: (.+?)(?:\n|$)/);
    return m ? { occasion: m[1], text: notes.slice(m[0].length).trim() } : { occasion: null, text: notes };
}

function isPastBooking(booking: Booking) {
    const dt = new Date(`${booking.booking_date}T${booking.booking_time}`);
    return dt.getTime() < Date.now() || booking.status === 'completed' || booking.status === 'cancelled';
}

export default function ArtistDashboard({ bookings }: Props) {
    const { auth } = usePage<{ auth?: { user?: { name?: string; role?: 'client' | 'artist' | 'admin' } } }>().props;
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
    const [busyId, setBusyId] = useState<number | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);
    const [messages, setMessages] = useState<Record<number, string>>({});

    const pending = useMemo(() => bookings.filter((b) => b.status === 'pending'), [bookings]);

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
            action === 'complete' ? {} : { artist_message: messages[id]?.trim() || null },
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

            <div className="min-h-screen bg-[#F2F5F8]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="dashboard"
                />

                <div className="mx-auto max-w-3xl px-6 py-10 md:px-12">
                    <div className="mb-8">
                        <p className="mb-1 text-xs uppercase tracking-widest text-[#5F83AB]">Artist Dashboard</p>
                        <h1 className="font-serif text-3xl font-bold text-[#1F2D40]">
                            Welcome back, {auth?.user?.name?.split(' ')[0] ?? 'there'}!
                        </h1>
                    </div>

                    {/* pending requests */}
                    {pending.length > 0 && (
                        <div className="mb-10">
                            <h2 className="mb-3 flex items-center gap-2 font-serif text-xl font-bold text-[#4A6A93]">
                                Pending Requests
                                <span className="rounded-full bg-[#E6EEF8] px-2.5 py-0.5 text-sm text-[#5F83AB]">{pending.length}</span>
                            </h2>
                            <div className="grid gap-4">
                                {pending.map((booking) => (
                                    <div key={booking.id} className="rounded-2xl border-2 border-[#95B1DB] bg-white p-5">
                                        <BookingHeader booking={booking} onViewInspo={setViewingUrl} />

                                        {/* optional message to client */}
                                        <div className="mt-4 grid gap-1.5">
                                            <label
                                                htmlFor={`msg-${booking.id}`}
                                                className="flex items-center gap-1.5 text-xs font-medium text-[#5B6B82]"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" /> Message to client{' '}
                                                <span className="font-normal">(optional)</span>
                                            </label>
                                            <textarea
                                                id={`msg-${booking.id}`}
                                                rows={2}
                                                maxLength={300}
                                                value={messages[booking.id] ?? ''}
                                                onChange={(e) =>
                                                    setMessages((prev) => ({ ...prev, [booking.id]: e.target.value }))
                                                }
                                                placeholder="e.g. Looking forward to it! Please arrive 10 mins early."
                                                className="w-full resize-none rounded-lg border border-[#95B1DB] bg-[#FAFCFE] px-3 py-2 text-sm text-[#1F2D40] placeholder:text-[#5B6B82]/60 focus-visible:border-[#769AD0] focus-visible:outline-none"
                                            />
                                        </div>

                                        <div className="mt-3 flex gap-2">
                                            <button
                                                type="button"
                                                disabled={busyId === booking.id}
                                                onClick={() => act(booking.id, 'accept')}
                                                className="flex items-center gap-1.5 rounded-full bg-[#2E7D46] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#256B3A] disabled:opacity-50"
                                            >
                                                <Check className="h-3.5 w-3.5" /> Accept
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busyId === booking.id}
                                                onClick={() => act(booking.id, 'decline')}
                                                className="flex items-center gap-1.5 rounded-full border border-[#A13F3F] px-4 py-1.5 text-xs font-semibold text-[#A13F3F] transition hover:bg-[#F5E0E0] disabled:opacity-50"
                                            >
                                                <X className="h-3.5 w-3.5" /> Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* schedule */}
                    <div className="mb-6 inline-flex rounded-full border border-[#95B1DB] bg-white p-1">
                        <button
                            type="button"
                            onClick={() => setTab('upcoming')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                tab === 'upcoming' ? 'bg-[#5F83AB] text-white' : 'text-[#5B6B82] hover:text-[#5F83AB]'
                            }`}
                        >
                            Upcoming ({upcoming.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('past')}
                            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                                tab === 'past' ? 'bg-[#5F83AB] text-white' : 'text-[#5B6B82] hover:text-[#5F83AB]'
                            }`}
                        >
                            Past ({past.length})
                        </button>
                    </div>

                    {visible.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#D3DFEF] bg-white px-6 py-16 text-center">
                            <Sparkles className="h-8 w-8 text-[#95B1DB]" />
                            <p className="font-semibold text-[#1F2D40]">
                                {tab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {visible.map((booking) => (
                                <div key={booking.id} className="rounded-2xl border border-[#D3DFEF] bg-white p-5">
                                    <BookingHeader booking={booking} onViewInspo={setViewingUrl} />
                                    {booking.status === 'confirmed' && (
                                        <button
                                            type="button"
                                            disabled={busyId === booking.id}
                                            onClick={() => act(booking.id, 'complete')}
                                            className="mt-4 rounded-full border border-[#5B4B9C] px-4 py-1.5 text-xs font-semibold text-[#5B4B9C] transition hover:bg-[#E6E6FA] disabled:opacity-50"
                                        >
                                            Mark as Completed
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
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

function BookingHeader({ booking, onViewInspo }: { booking: Booking; onViewInspo: (url: string) => void }) {
    const { occasion, text } = splitNotes(booking.notes);

    return (
        <>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="font-serif text-lg font-bold text-[#1F2D40]">{booking.service}</p>
                    <p className="text-sm text-[#5B6B82]">with {booking.client.name}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[booking.status]}`}>
                    {booking.status}
                </span>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-[#5B6B82]">
                <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#5F83AB]" /> {formatDate(booking.booking_date)}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#5F83AB]" /> {formatTime(booking.booking_time)}
                </span>
                {booking.client.phone && (
                    <span className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-[#5F83AB]" /> {booking.client.phone}
                    </span>
                )}
            </div>

            {occasion && (
                <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-[#5B6B82]">Occasion</p>
                    <span className="inline-block rounded-full bg-[#E6EEF8] px-3 py-1 text-xs font-semibold text-[#5F83AB]">
                        {occasion}
                    </span>
                </div>
            )}

            {text && (
                <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-[#5B6B82]">Client's notes</p>
                    <p className="whitespace-pre-line rounded-lg bg-[#F2F5F8] px-3 py-2 text-sm text-[#1F2D40]">{text}</p>
                </div>
            )}

            {booking.artist_message && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#E6E6FA] px-3 py-2 text-sm text-[#5B4B9C]">
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {booking.artist_message}
                </p>
            )}

            {booking.inspo_url && (
                <button
                    type="button"
                    onClick={() => onViewInspo(booking.inspo_url!)}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-[#95B1DB] bg-[#FAFCFE] p-2 transition hover:bg-[#E6EEF8]"
                >
                    <img src={booking.inspo_url} alt="Inspo" className="h-10 w-10 rounded-md object-cover" />
                    <span className="flex items-center gap-1 text-xs font-semibold text-[#5F83AB]">
                        <ImageIcon className="h-3.5 w-3.5" /> View makeup inspo
                    </span>
                </button>
            )}
        </>
    );
}
