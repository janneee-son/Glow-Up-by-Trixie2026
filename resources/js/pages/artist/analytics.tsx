import { Head, usePage } from '@inertiajs/react';
import { BarChart3, CalendarDays, ClipboardList, Sparkles } from 'lucide-react';
import DashboardHeader from '@/components/dashboard-header';

type PopularService = {
    service: string;
    bookings_count: number;
};

type Props = {
    totalBookings: number;
    thisMonthBookings: number;
    pendingBookings: number;
    popularServices: PopularService[];
};

export default function ArtistAnalytics({
    totalBookings,
    thisMonthBookings,
    pendingBookings,
    popularServices,
}: Props) {
    const { auth } = usePage<{
        auth?: { user?: { name?: string; role?: 'artist' | 'client' | 'admin' } };
    }>().props;
    const busiestCount = Math.max(1, ...popularServices.map((item) => item.bookings_count));

    return (
        <>
            <Head title="Booking analytics" />
            <div className="min-h-screen bg-[#F2F5F8]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="analytics"
                />
                <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-7 sm:px-6 md:py-10">
                    <section className="rounded-[2rem] border border-[#D3DFEF] bg-gradient-to-br from-[#FAFCFE] via-white to-[#E6EEF8] p-6 shadow-lg shadow-[#95B1DB]/10 md:p-8">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-[#5F83AB] uppercase"><Sparkles className="h-4 w-4" /> Artist studio</p>
                        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1F2D40] sm:text-4xl">Booking analytics</h1>
                        <p className="mt-2 text-sm leading-6 text-[#5B6B82] sm:text-base">See which services and packages clients book most often.</p>
                    </section>

                    <section aria-label="Booking totals" className="grid gap-4 sm:grid-cols-3">
                        <SummaryCard icon={<ClipboardList className="h-5 w-5" />} label="Bookings overall" value={totalBookings} />
                        <SummaryCard icon={<CalendarDays className="h-5 w-5" />} label="This month" value={thisMonthBookings} />
                        <SummaryCard icon={<BarChart3 className="h-5 w-5" />} label="Waiting for your reply" value={pendingBookings} />
                    </section>

                    <section className="rounded-3xl border border-[#D3DFEF] bg-white p-5 shadow-sm sm:p-7">
                        <div className="mb-6">
                            <p className="text-xs font-semibold tracking-[0.16em] text-[#5F83AB] uppercase">Most requested</p>
                            <h2 className="mt-1 font-serif text-2xl font-bold text-[#1F2D40]">Bookings by service or package</h2>
                            <p className="mt-1 text-sm text-[#5B6B82]">Counts include pending, confirmed, and completed bookings. Cancelled bookings are excluded.</p>
                        </div>
                        {popularServices.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-[#B5C8E5] bg-[#FAFCFE] p-5 text-sm text-[#5B6B82]">Booking counts will appear here when clients request a service or package.</p>
                        ) : (
                            <ol className="grid gap-4">
                                {popularServices.map((item, index) => (
                                    <li key={item.service} className="grid gap-2 sm:grid-cols-[2fr_5fr_auto] sm:items-center sm:gap-4">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E6EEF8] text-sm font-bold text-[#5F83AB]">{index + 1}</span>
                                            <span className="truncate font-medium text-[#1F2D40]">{item.service}</span>
                                        </div>
                                        <div className="h-3 overflow-hidden rounded-full bg-[#F2F5F8]">
                                            <div className="h-full rounded-full bg-gradient-to-r from-[#5F83AB] to-[#95B1DB]" style={{ width: `${Math.max(5, (item.bookings_count / busiestCount) * 100)}%` }} />
                                        </div>
                                        <span className="text-sm font-semibold text-[#5B6B82]">{item.bookings_count} {item.bookings_count === 1 ? 'booking' : 'bookings'}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <article className="rounded-2xl border border-[#D3DFEF] bg-white p-5 shadow-sm shadow-[#95B1DB]/10">
            <div className="flex items-center gap-2 text-[#5F83AB]">{icon}<p className="text-xs font-semibold tracking-wider text-[#5B6B82] uppercase">{label}</p></div>
            <p className="mt-3 font-serif text-3xl font-bold text-[#1F2D40]">{value}</p>
        </article>
    );
}
