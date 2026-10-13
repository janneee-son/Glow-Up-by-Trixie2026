import { Head, usePage } from '@inertiajs/react';
import {
    Ban,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Clock3,
    Coins,
    Sparkles,
} from 'lucide-react';
import DashboardHeader from '@/components/dashboard-header';

type PopularService = {
    service: string;
    bookings_count: number;
};

type MonthlyTrend = {
    month: string;
    bookings_count: number;
};

type NextBooking = {
    id: number;
    service: string;
    client_name: string;
    booking_date: string;
    booking_time: string;
    status: 'pending' | 'confirmed';
    estimated_total: number | null;
};

type Props = {
    totalBookings: number;
    thisMonthBookings: number;
    upcomingBookings: number;
    pendingBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    confirmedValueEstimate: number;
    popularServices: PopularService[];
    monthlyTrend: MonthlyTrend[];
    nextBookings: NextBooking[];
};

const peso = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const dateLabel = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

const timeLabel = (time: string) => {
    const [hours = '0', minutes = '0'] = time.split(':');
    return new Date(2000, 0, 1, Number(hours), Number(minutes)).toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    });
};

export default function ArtistAnalytics({
    totalBookings,
    thisMonthBookings,
    upcomingBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    confirmedValueEstimate,
    popularServices,
    monthlyTrend,
    nextBookings,
}: Props) {
    const { auth } = usePage<{
        auth?: { user?: { name?: string; role?: 'artist' | 'client' | 'admin' } };
    }>().props;

    const busiestCount = Math.max(1, ...popularServices.map((item) => item.bookings_count));
    const busiestMonth = Math.max(1, ...monthlyTrend.map((item) => item.bookings_count));
    const statusTotal = pendingBookings + confirmedBookings + completedBookings + cancelledBookings;
    const statusItems = [
        { label: 'Awaiting reply', count: pendingBookings, icon: <Clock3 className="h-4 w-4" />, color: 'bg-[#c9a66b]' },
        { label: 'Confirmed', count: confirmedBookings, icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-[#6f8f72]' },
        { label: 'Completed', count: completedBookings, icon: <Sparkles className="h-4 w-4" />, color: 'bg-[#8a6a2f]' },
        { label: 'Cancelled', count: cancelledBookings, icon: <Ban className="h-4 w-4" />, color: 'bg-[#b9656d]' },
    ];

    return (
        <>
            <Head title="Booking analytics" />
            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="analytics"
                />
                <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-7 sm:px-6 md:py-10">
                    <section className="rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                            <Sparkles className="h-4 w-4" /> Artist studio
                        </p>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                            Booking analytics
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                            A clear view of your bookings, client requests, and most requested services.
                        </p>
                    </section>

                    <section aria-label="Booking summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="Bookings overall" value={totalBookings} detail="Pending, confirmed, and completed" />
                        <SummaryCard icon={<CalendarDays className="h-5 w-5" />} label="Scheduled this month" value={thisMonthBookings} detail="Based on appointment date" />
                        <SummaryCard icon={<CalendarDays className="h-5 w-5" />} label="Upcoming appointments" value={upcomingBookings} detail="Pending or confirmed, from today" />
                        <SummaryCard icon={<Clock3 className="h-5 w-5" />} label="Waiting for your reply" value={pendingBookings} detail="Client requests to review" />
                        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Completed sessions" value={completedBookings} detail="All time" />
                        <SummaryCard icon={<Coins className="h-5 w-5" />} label="Confirmed booking value" value={peso(confirmedValueEstimate)} detail="Estimate for confirmed and completed bookings" />
                    </section>

                    <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                        <article className="rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-5">
                                <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">Booking activity</p>
                                <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">Last six months</h2>
                                <p className="mt-1 text-sm text-[#4a4a4a]">Appointments by date, excluding cancellations.</p>
                            </div>
                            {monthlyTrend.length > 0 && monthlyTrend.some((month) => month.bookings_count > 0) ? (
                                <div className="grid h-52 grid-cols-6 items-end gap-3 border-b border-[#e8d7cf] px-1 sm:gap-5">
                                    {monthlyTrend.map((month) => (
                                        <div key={month.month} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                                            <span className="text-xs font-semibold text-[#4a4a4a]">{month.bookings_count}</span>
                                            <div className="flex h-36 w-full items-end justify-center">
                                                <div
                                                    className="w-full max-w-12 rounded-t-xl bg-gradient-to-t from-[#8a6a2f] to-[#c9a66b] transition-all"
                                                    style={{ height: `${Math.max(month.bookings_count > 0 ? 10 : 0, (month.bookings_count / busiestMonth) * 100)}%` }}
                                                    aria-label={`${month.month}: ${month.bookings_count} bookings`}
                                                />
                                            </div>
                                            <span className="pb-2 text-xs text-[#4a4a4a]">{month.month}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState>Monthly activity will appear here as you receive bookings.</EmptyState>
                            )}
                        </article>

                        <article className="rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-5">
                                <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">At a glance</p>
                                <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">Booking status</h2>
                            </div>
                            <div className="mb-5 flex h-3 overflow-hidden rounded-full bg-[#faf7f4]" aria-label="Booking status distribution">
                                {statusItems.map((item) => (
                                    <div
                                        key={item.label}
                                        className={item.color}
                                        style={{ width: `${statusTotal ? (item.count / statusTotal) * 100 : 0}%` }}
                                        title={`${item.label}: ${item.count}`}
                                    />
                                ))}
                            </div>
                            <ul className="grid gap-4">
                                {statusItems.map((item) => (
                                    <li key={item.label} className="flex items-center justify-between gap-3">
                                        <span className="flex items-center gap-2 text-sm text-[#4a4a4a]">
                                            <span className="text-[#8a6a2f]">{item.icon}</span>{item.label}
                                        </span>
                                        <span className="font-semibold text-[#1a1a1a]">{item.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    </section>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <article className="rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-6">
                                <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">Most requested</p>
                                <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">Bookings by service or package</h2>
                                <p className="mt-1 text-sm text-[#4a4a4a]">Includes pending, confirmed, and completed bookings.</p>
                            </div>
                            {popularServices.length === 0 ? (
                                <EmptyState>Booking counts will appear here when clients request a service or package.</EmptyState>
                            ) : (
                                <ol className="grid gap-4">
                                    {popularServices.map((item, index) => (
                                        <li key={item.service} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] sm:items-center sm:gap-4">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4e9e5] text-sm font-bold text-[#8a6a2f]">{index + 1}</span>
                                                <span className="truncate font-medium text-[#1a1a1a]">{item.service}</span>
                                            </div>
                                            <div className="h-3 overflow-hidden rounded-full bg-[#faf7f4]">
                                                <div className="h-full rounded-full bg-gradient-to-r from-[#8a6a2f] to-[#c9a66b]" style={{ width: `${Math.max(5, (item.bookings_count / busiestCount) * 100)}%` }} />
                                            </div>
                                            <span className="text-sm font-semibold text-[#4a4a4a]">{item.bookings_count} {item.bookings_count === 1 ? 'booking' : 'bookings'}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </article>

                        <article className="rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-6">
                                <p className="text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">Plan your day</p>
                                <h2 className="mt-1 font-serif text-2xl font-bold text-[#1a1a1a]">Next appointments</h2>
                            </div>
                            {nextBookings.length === 0 ? (
                                <EmptyState>You have no upcoming appointments right now.</EmptyState>
                            ) : (
                                <ul className="grid gap-3">
                                    {nextBookings.map((booking) => (
                                        <li key={booking.id} className="rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-semibold text-[#1a1a1a]">{booking.service}</h3>
                                                    <p className="mt-0.5 text-sm text-[#4a4a4a]">with {booking.client_name}</p>
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${booking.status === 'confirmed' ? 'bg-[#e7efe5] text-[#426948]' : 'bg-[#f4e9d6] text-[#8a6a2f]'}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[#4a4a4a]">
                                                <span>{dateLabel(booking.booking_date)} · {timeLabel(booking.booking_time)}</span>
                                                {booking.estimated_total !== null && <span className="font-semibold text-[#8a6a2f]">{peso(booking.estimated_total)}</span>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </article>
                    </section>
                </main>
            </div>
        </>
    );
}

function SummaryCard({
    icon,
    label,
    value,
    detail,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    detail: string;
}) {
    return (
        <article className="rounded-2xl border border-[#e8d7cf] bg-white p-5 shadow-sm shadow-[#c9a66b]/10">
            <div className="flex items-center gap-2 text-[#8a6a2f]">
                {icon}<p className="text-xs font-semibold tracking-wider text-[#4a4a4a] uppercase">{label}</p>
            </div>
            <p className="mt-3 font-serif text-3xl font-bold text-[#1a1a1a]">{value}</p>
            <p className="mt-1 text-xs leading-5 text-[#6b625d]">{detail}</p>
        </article>
    );
}

function EmptyState({ children }: { children: React.ReactNode }) {
    return <p className="rounded-2xl border border-dashed border-[#d7c0a2] bg-[#fffcf8] p-5 text-sm text-[#4a4a4a]">{children}</p>;
}
