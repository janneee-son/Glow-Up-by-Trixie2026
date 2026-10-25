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
    Settings2,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';

type Props = {
    userName: string;
    userRole?: 'client' | 'artist' | 'admin';
    active?:
        | 'dashboard'
        | 'book'
        | 'inspo'
        | 'profile'
        | 'services'
        | 'booking-settings'
        | 'gallery'
        | 'analytics';
};

type DashboardNotification = {
    id: string;
    read_at: string | null;
    title: string;
    booking_id: number;
    client_name?: string;
    artist_name?: string;
    service: string;
    booking_date: string;
    booking_time: string;
    artist_message?: string | null;
    detail?: string | null;
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
                key: 'booking-settings' as const,
                label: 'Booking Settings',
                href: '/artist/booking-settings',
                icon: Settings2,
            },
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
    const { auth } = usePage<{
        auth?: { user?: { avatar_url?: string | null } | null };
    }>().props;
    const [menuOpen, setMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<DashboardNotification[]>(
        [],
    );
    const [unreadCount, setUnreadCount] = useState(0);
    const navItems = buildNavItems(userRole);

    const refreshNotifications = useCallback(async () => {
        if (userRole !== 'artist' && userRole !== 'client') {
            return;
        }

        try {
            const endpoint =
                userRole === 'artist'
                    ? '/artist/notifications'
                    : '/client/notifications';
            const response = await fetch(endpoint, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                return;
            }

            const payload = await response.json();
            setNotifications(payload.notifications ?? []);
            setUnreadCount(payload.unread_count ?? 0);
        } catch {
            // A notification refresh should not interrupt dashboard navigation.
        }
    }, [userRole]);

    useEffect(() => {
        if (userRole !== 'artist' && userRole !== 'client') {
            return;
        }

        const initialRefresh = window.setTimeout(
            () => void refreshNotifications(),
            0,
        );
        const timer = window.setInterval(
            () => void refreshNotifications(),
            15000,
        );

        return () => {
            window.clearTimeout(initialRefresh);
            window.clearInterval(timer);
        };
    }, [refreshNotifications, userRole]);

    function openBookingNotification(notification: DashboardNotification) {
        const endpoint =
            userRole === 'artist'
                ? '/artist/notifications'
                : '/client/notifications';
        router.patch(
            `${endpoint}/${notification.id}/read`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNotificationsOpen(false);
                    void refreshNotifications();
                    router.visit(
                        `/dashboard#booking-${notification.booking_id}`,
                    );
                },
            },
        );
    }

    const linkClass = (key: Props['active']) =>
        `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            active === key
                ? 'bg-[#f4e9e5] text-[#8a6a2f]'
                : 'text-[#4a4a4a] hover:bg-[#f4e9e5]/60 hover:text-[#8a6a2f]'
        }`;

    const mobileLinkClass = (key: Props['active']) =>
        `flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
            active === key
                ? 'bg-[#f4e9e5] text-[#8a6a2f]'
                : 'text-[#4a4a4a] hover:bg-[#f4e9e5]/60 hover:text-[#8a6a2f]'
        }`;

    return (
        <header className="sticky top-0 z-20 border-b border-[#e8d7cf] bg-[#faf7f4] sm:bg-[#faf7f4]/90 sm:backdrop-blur">
            <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-4 md:px-12">
                <Link
                    href="/dashboard"
                    className="flex min-w-0 items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                >
                    <AppLogoIcon className="h-10 w-10 object-contain" />
                    <span className="whitespace-nowrap font-display text-sm font-bold text-[#1A1A1A] sm:text-lg">
                        Glow Up by Trixie
                    </span>
                </Link>

                <nav className="hidden items-center gap-2 sm:flex">
                    {navItems
                        .filter(({ key }) => key !== 'profile' && key !== 'booking-settings')
                        .map(({ key, label, href, icon: Icon }) => (
                            <Link
                                key={key}
                                href={href}
                                className={linkClass(key)}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        ))}
                </nav>

                <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                    {(userRole === 'artist' || userRole === 'client') && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() =>
                                    setNotificationsOpen((open) => !open)
                                }
                                aria-label="Notifications"
                                aria-expanded={notificationsOpen}
                                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#c9a66b] text-[#8a6a2f] transition hover:bg-[#f4e9e5]"
                            >
                                <Bell className="h-4 w-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#8a6a2f] px-1 text-[10px] font-bold text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>
                            {notificationsOpen && (
                                <div className="fixed top-16 right-3 left-3 z-50 mx-auto max-h-[calc(100dvh-5rem)] w-auto max-w-md overflow-hidden rounded-2xl border border-[#e8d7cf] bg-white shadow-xl sm:absolute sm:top-auto sm:right-0 sm:left-auto sm:mt-3 sm:w-[22rem] sm:max-w-[calc(100vw-2rem)]">
                                    <div className="flex items-center justify-between border-b border-[#e8d7cf] px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-[#1a1a1a]">
                                                Notifications
                                            </p>
                                            <p className="text-xs text-[#6b625a]">
                                                {unreadCount} unread
                                            </p>
                                        </div>
                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const endpoint =
                                                        userRole === 'artist'
                                                            ? '/artist/notifications'
                                                            : '/client/notifications';
                                                    router.patch(
                                                        `${endpoint}/read-all`,
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () =>
                                                                void refreshNotifications(),
                                                        },
                                                    );
                                                }}
                                                className="text-xs font-semibold text-[#8a6a2f] hover:underline"
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[min(24rem,calc(100dvh-10rem))] overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <p className="p-4 text-sm text-[#6b625a]">
                                                No booking updates yet.
                                            </p>
                                        ) : (
                                            notifications.map(
                                                (notification) => (
                                                    <button
                                                        type="button"
                                                        key={notification.id}
                                                        onClick={() =>
                                                            openBookingNotification(
                                                                notification,
                                                            )
                                                        }
                                                        className={`block w-full border-b border-[#f3eee9] px-4 py-3 text-left transition hover:bg-[#fdf8f4] ${notification.read_at ? 'bg-white' : 'bg-[#f7ece8]'}`}
                                                    >
                                                        <span className="flex items-center justify-between gap-3">
                                                            <span className="min-w-0 break-words text-sm font-semibold text-[#1a1a1a]">
                                                                {
                                                                    notification.title
                                                                }
                                                            </span>
                                                            {!notification.read_at && (
                                                                <span className="h-2 w-2 rounded-full bg-[#8a6a2f]" />
                                                            )}
                                                        </span>
                                                        <span className="mt-1 block break-words text-sm text-[#4a4a4a]">
                                                            {userRole ===
                                                            'artist'
                                                                ? notification.client_name
                                                                : notification.artist_name}{' '}
                                                            ·{' '}
                                                            {
                                                                notification.service
                                                            }
                                                        </span>
                                                        <span className="mt-1 block break-words text-xs text-[#6b625a]">
                                                            {new Date(
                                                                `${notification.booking_date}T${notification.booking_time}`,
                                                            ).toLocaleString()}
                                                        </span>
                                                        {notification.artist_message && (
                                                            <span className="mt-1 block break-words text-xs text-[#4a4a4a]">
                                                                “
                                                                {
                                                                    notification.artist_message
                                                                }
                                                                ”
                                                            </span>
                                                        )}
                                                        {notification.detail && (
                                                            <span className="mt-1 block break-words text-xs font-medium text-[#8a6a2f]">
                                                                {
                                                                    notification.detail
                                                                }
                                                            </span>
                                                        )}
                                                    </button>
                                                ),
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {userRole === 'artist' && (
                        <Link
                            href="/artist/booking-settings"
                            aria-label="Booking Settings"
                            title="Booking Settings"
                            aria-current={active === 'booking-settings' ? 'page' : undefined}
                            className={`flex h-9 w-9 items-center justify-center rounded-full border border-[#c9a66b] transition hover:bg-[#f4e9e5] ${active === 'booking-settings' ? 'bg-[#f4e9e5] text-[#8a6a2f]' : 'text-[#8a6a2f]'}`}
                        >
                            <Settings2 className="h-4 w-4" />
                        </Link>
                    )}
                    <Link
                        href="/profile"
                        aria-label={`Profile for ${userName}`}
                        title="Profile"
                        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#c9a66b] bg-white transition hover:bg-[#f4e9e5]"
                        aria-current={active === 'profile' ? 'page' : undefined}
                    >
                        {auth?.user?.avatar_url ? (
                            <img
                                src={auth.user.avatar_url}
                                alt=""
                                className="h-full w-full rounded-full object-cover"
                            />
                        ) : (
                            <span aria-hidden="true" className="font-semibold text-[#8a6a2f]">{userName.trim().charAt(0).toUpperCase()}</span>
                        )}
                    </Link>

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="hidden items-center gap-1.5 rounded-full border border-[#c9a66b] px-4 py-1.5 text-sm font-semibold text-[#8a6a2f] transition-colors duration-200 hover:bg-[#f4e9e5] sm:flex"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Log out
                    </Link>

                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c9a66b] text-[#8a6a2f] sm:hidden"
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
                <nav className="flex flex-col gap-1 border-t border-[#e8d7cf] bg-[#faf7f4] px-4 py-3 sm:hidden">
                    {navItems.filter(({ key }) => key !== 'booking-settings').map(({ key, label, href, icon: Icon }) => (
                        <Link
                            key={key}
                            href={href}
                            className={mobileLinkClass(key)}
                            onClick={() => setMenuOpen(false)}
                        >
                            {key === 'profile' && auth?.user?.avatar_url ? (
                                <img
                                    src={auth.user.avatar_url}
                                    alt=""
                                    className="h-6 w-6 rounded-full object-cover ring-1 ring-[#c9a66b]"
                                />
                            ) : (
                                <Icon className="h-4 w-4" />
                            )}
                            {label}
                        </Link>
                    ))}

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#8a6a2f] hover:bg-[#f4e9e5]/60"
                    >
                        <LogOut className="h-4 w-4" />
                        Log out
                    </Link>
                </nav>
            )}
        </header>
    );
}
