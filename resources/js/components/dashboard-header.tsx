import { Link } from '@inertiajs/react';
import { CalendarPlus, ImagePlus, LayoutDashboard, LogOut, Menu, Sparkles, User as UserIcon, X } from 'lucide-react';
import { useState } from 'react';

type Props = {
    userName: string;
    userRole?: 'client' | 'artist' | 'admin';
    active?: 'dashboard' | 'book' | 'inspo' | 'profile';
};

function buildNavItems(userRole: Props['userRole']) {
    const items = [
        {
            key: 'dashboard' as const,
            label: userRole === 'artist' ? 'My Schedule' : 'My Bookings',
            href: '/dashboard',
            icon: LayoutDashboard,
        },
        { key: 'book' as const, label: 'Book a Session', href: '/book', icon: CalendarPlus },
        { key: 'inspo' as const, label: 'Inspiration History', href: '/inspo', icon: ImagePlus },
        { key: 'profile' as const, label: 'Profile', href: '/profile', icon: UserIcon },
    ];

    // The artist only manages bookings and their own profile.
    return userRole === 'artist'
        ? items.filter((item) => item.key === 'dashboard' || item.key === 'profile')
        : items;
}

export default function DashboardHeader({ userName, userRole = 'client', active = 'dashboard' }: Props) {
    const [menuOpen, setMenuOpen] = useState(false);
    const navItems = buildNavItems(userRole);

    const linkClass = (key: Props['active']) =>
        `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
            active === key ? 'bg-[#FCE4EC] text-[#E75480]' : 'text-[#7A5560] hover:bg-[#FCE4EC]/60 hover:text-[#E75480]'
        }`;

    const mobileLinkClass = (key: Props['active']) =>
        `flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
            active === key ? 'bg-[#FCE4EC] text-[#E75480]' : 'text-[#7A5560] hover:bg-[#FCE4EC]/60 hover:text-[#E75480]'
        }`;

    return (
        <header className="sticky top-0 z-20 border-b border-[#F7C6D9] bg-[#FFF5F7]/90 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-4 md:px-12">
                <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                    <Sparkles className="h-5 w-5 text-[#E75480]" />
                    <span className="font-bold text-[#E75480]">Prishana Aesthetics</span>
                </Link>

                {/* desktop nav */}
                <nav className="hidden items-center gap-2 sm:flex">
                    {navItems.map(({ key, label, href, icon: Icon }) => (
                        <Link key={key} href={href} className={linkClass(key)}>
                            <Icon className="h-4 w-4" /> {label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-3">
                    <span className="hidden text-sm text-[#7A5560] md:inline">Hi, {userName.split(' ')[0]}</span>
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="hidden items-center gap-1.5 rounded-full border border-[#F3A6C0] px-4 py-1.5 text-sm font-semibold text-[#E75480] transition-colors duration-200 hover:bg-[#FCE4EC] sm:flex"
                    >
                        <LogOut className="h-3.5 w-3.5" /> Log out
                    </Link>

                    {/* mobile menu toggle */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F3A6C0] text-[#E75480] sm:hidden"
                    >
                        {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* mobile menu panel */}
            {menuOpen && (
                <nav className="flex flex-col gap-1 border-t border-[#F7C6D9] bg-[#FFF5F7] px-4 py-3 sm:hidden">
                    {navItems.map(({ key, label, href, icon: Icon }) => (
                        <Link key={key} href={href} className={mobileLinkClass(key)} onClick={() => setMenuOpen(false)}>
                            <Icon className="h-4 w-4" /> {label}
                        </Link>
                    ))}
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-medium text-[#E75480] hover:bg-[#FCE4EC]/60"
                    >
                        <LogOut className="h-4 w-4" /> Log out
                    </Link>
                </nav>
            )}
        </header>
    );
}
        