import { Link, router, usePage } from '@inertiajs/react';
import {
    BriefcaseBusiness,
    Bell,
    CalendarPlus,
    ChartNoAxesColumnIncreasing,
    ImagePlus,
    LayoutDashboard,
    LogOut,
    Menu,
    Sparkles,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Props = {
    userName: string;
    userRole?: 'client' | 'artist' | 'admin';
    active?:
        'dashboard' | 'book' | 'inspo' | 'profile' | 'services' | 'gallery' | 'analytics';
};

type ArtistNotification = {
    id: string;
    read_at: string | null;
    title: string;
    booking_id: number;
    client_name: string;
    service: string;
    booking_date: string;
    booking_time: string;
};

function buildNavItems(userRole: Props['userRole']) {
    const items = [
        {
            key: 'dashboard' as const,
            label: userRole === 'artist' ? 'My Schedule' : 'My Bookings',
            href: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            key: 'book' as const,
            label: 'Book a Session',
            href: '/book',
            icon: CalendarPlus,
        },
        {
            key: 'inspo' as const,
            label: 'Inspiration History',
            href: '/inspo',
            icon: ImagePlus,
        },
        {
            key: 'profile' as const,
            label: 'Profile',
            href: '/profile',
            icon: UserIcon,
        },
    ];

    if (userRole === 'artist') {
        return [
            ...items.filter(
                (item) => item.key === 'dashboard' || item.key === 'profile',
            ),
            {
                key: 'services' as const,
                label: 'Services',
                href: '/artist/services',
                icon: BriefcaseBusiness,
            },

            {
                key: 'gallery' as const,
                label: 'Recent Work',
                href: '/admin/gallery',
                icon: ImagePlus,
            },
            {
                key: 'analytics' as const,
                label: 'Analytics',
                href: '/artist/analytics',
                icon: ChartNoAxesColumnIncreasing,
            },
        ];
    }

    return items;
}

export default function DashboardHeader({
    userName,
    userRole = 'client',
    active = 'dashboard',
}: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<ArtistNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navItems = buildNavItems(userRole);

    const refreshNotifications = useCallback(async () => {
        try {
            const response = await fetch('/artist/notifications', {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) return;
            const payload = await response.json();
            setNotifications(payload.notifications ?? []);
            setUnreadCount(payload.unread_count ?? 0);
        } catch {
            // A notification refresh should not interrupt dashboard navigation.
        }
    }, []);

    useEffect(() => {
        if (userRole !== 'artist') return;
        void refreshNotifications();
        const timer = window.setInterval(() => void refreshNotifications(), 15000);
        return () => window.clearInterval(timer);
    }, [refreshNotifications, userRole]);

    function openBookingNotification(notification: ArtistNotification) {
        router.patch(`/artist/notifications/${notification.id}/read`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                setNotificationsOpen(false);
                void refreshNotifications();
                router.visit(`/dashboard#booking-${notification.booking_id}`);
            },
        });
    }

    const linkClass = (key: Props['active']) =>
        `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            active === key
                ? 'bg-[#E6EEF8] text-[#5F83AB]'
                : 'text-[#5B6B82] hover:bg-[#E6EEF8]/60 hover:text-[#5F83AB]'
        }`;

    const mobileLinkClass = (key: Props['active']) =>
        `flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
            active === key
                ? 'bg-[#E6EEF8] text-[#5F83AB]'
                : 'text-[#5B6B82] hover:bg-[#E6EEF8]/60 hover:text-[#5F83AB]'
        }`;

    return (
        <header className="sticky top-0 z-20 border-b border-[#D3DFEF] bg-[#F2F5F8]/90 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4 md:px-12">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                >
                    <Sparkles className="h-5 w-5 text-[#5F83AB]" />
                    <span className="font-bold text-[#5F83AB]">
                        Glow Up by Trixie
                    </span>
                </Link>

                <nav className="hidden items-center gap-2 sm:flex">
                    {navItems.map(({ key, label, href, icon: Icon }) => (
                        <Link key={key} href={href} className={linkClass(key)}>
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    {userRole === 'artist' && <div className="relative">
                        <button type="button" onClick={() => setNotificationsOpen((open) => !open)} aria-label="Notifications" aria-expanded={notificationsOpen} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#95B1DB] text-[#5F83AB] transition hover:bg-[#E6EEF8]">
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#A75F78] px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                        </button>
                        {notificationsOpen && <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#D3DFEF] bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-[#E8EDF4] px-4 py-3"><div><p className="font-semibold text-[#1F2D40]">Notifications</p><p className="text-xs text-[#6B7890]">{unreadCount} unread</p></div>{unreadCount > 0 && <button type="button" onClick={() => router.patch('/artist/notifications/read-all', {}, { preserveScroll: true, onSuccess: () => void refreshNotifications() })} className="text-xs font-semibold text-[#5F83AB] hover:underline">Mark all read</button>}</div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? <p className="p-4 text-sm text-[#6B7890]">No booking notifications yet.</p> : notifications.map((notification) => <button type="button" key={notification.id} onClick={() => openBookingNotification(notification)} className={`block w-full border-b border-[#F0F2F6] px-4 py-3 text-left transition hover:bg-[#F7F9FC] ${notification.read_at ? 'bg-white' : 'bg-[#F2F6FC]'}`}>
                                    <span className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[#1F2D40]">{notification.title}</span>{!notification.read_at && <span className="h-2 w-2 rounded-full bg-[#A75F78]" />}</span>
                                    <span className="mt-1 block text-sm text-[#52627A]">{notification.client_name} · {notification.service}</span>
                                    <span className="mt-1 block text-xs text-[#758299]">{new Date(`${notification.booking_date}T${notification.booking_time}`).toLocaleString()}</span>
                                </button>)}</div>
                        </div>}
                    </div>}
                    <span className="hidden text-sm text-[#5B6B82] md:inline">
                        Hi, {userName.split(' ')[0]}
                    </span>

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="hidden items-center gap-1.5 rounded-full border border-[#95B1DB] px-4 py-1.5 text-sm font-semibold text-[#5F83AB] transition-colors duration-200 hover:bg-[#E6EEF8] sm:flex"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out
                    </Link>

                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#95B1DB] text-[#5F83AB] sm:hidden"
                    >
                        {menuOpen ? (
                            <X className="h-4 w-4" />
                        ) : (
                            <Menu className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <nav className="flex flex-col gap-1 border-t border-[#D3DFEF] bg-[#F2F5F8] px-4 py-3 sm:hidden">
                    {navItems.map(({ key, label, href, icon: Icon }) => (
                        <Link
                            key={key}
                            href={href}
                            className={mobileLinkClass(key)}
                            onClick={() => setMenuOpen(false)}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </Link>
                    ))}

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#5F83AB] hover:bg-[#E6EEF8]/60"
                    >
                        <LogOut className="h-4 w-4" />
                        Log out
                    </Link>
                </nav>
            )}
        </header>
    );
}
