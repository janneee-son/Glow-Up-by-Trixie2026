import { Head, Link, usePage } from '@inertiajs/react';
import { BadgeCheck, Brush, CalendarCheck, Camera, Clock, MapPin, Sparkles } from 'lucide-react';
import { dashboard, login, register } from '@/routes';

type Artist = {
    name: string;
    specialty: string | null;
    years_experience: number | null;
    bio: string | null;
    street_address: string | null;
    barangay: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
};

type Service = {
    id: number;
    name: string;
    price: number | string;
    description: string | null;
};

type Props = {
    artist: Artist | null;
    services: Service[];
};

const NAV_LINKS = [
    { label: 'Services', href: '#services' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Your artist', href: '#artist' },
    { label: 'Gallery', href: '#gallery' },
];

const STEPS = [
    { title: 'Choose', desc: 'Pick a service and tell us the occasion.' },
    { title: 'Book', desc: 'Select a date and time that works for you.' },
    { title: 'Get glammed', desc: 'Show up and let your artist work their magic.' },
    { title: 'Shine', desc: 'Walk out confident and camera-ready.' },
];

const ARTIST_PHOTO: string | null = '/images/gallery/artist.png';

const HERO_PHOTOS: (string | null)[] = [
    '/images/gallery/image01.png',
    '/images/gallery/image02.png',
];

const GALLERY: (string | null)[] = [
    '/images/gallery/image03.png',
    '/images/gallery/image07.png',
    '/images/gallery/image05.png',
    '/images/gallery/image06.png',
];

function Photo({ src, alt }: { src: string | null | undefined; alt: string }) {
    if (src) {
        return <img src={src} alt={alt} className="h-full w-full object-cover" />;
    }

    return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E6EEF8] to-[#D3DFEF] text-[#5F83AB]/60">
            <Camera className="h-8 w-8" />
        </div>
    );
}

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-10 max-w-xl">
            <h3 className="font-display text-3xl font-bold leading-tight text-[#1F2D40] sm:text-4xl">
                {title}
            </h3>
            {sub && <p className="mt-3 leading-relaxed text-[#5B6B82]">{sub}</p>}
        </div>
    );
}

const primaryBtn =
    'inline-flex items-center justify-center rounded-full bg-[#5F83AB] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-[#95B1DB]/50 transition-colors duration-200 hover:bg-[#4E7099] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5F83AB]';

const secondaryBtn =
    'inline-flex items-center justify-center rounded-full border border-[#5F83AB]/50 px-7 py-3 text-sm font-semibold text-[#4A6A93] transition-colors duration-200 hover:bg-[#E6EEF8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5F83AB]';

export default function Welcome({ artist, services }: Props) {
    const { auth } = usePage<{ auth?: { user?: unknown } }>().props;
    const isLoggedIn = Boolean(auth?.user);
    const bookHref = isLoggedIn ? dashboard() : register();

    const navLinks = NAV_LINKS.filter((link) => link.href !== '#artist' || artist);

    const firstName = artist?.name.split(' ')[0] ?? '';
    const initials = artist
        ? artist.name
              .split(' ')
              .map((word) => word[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : '';

    const studioAddress = artist
        ? [artist.street_address, artist.barangay, artist.city, artist.province, artist.postal_code]
              .filter(Boolean)
              .join(', ')
        : '';

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studioAddress)}`;

    return (
        <>
            <Head title="JM Makeup Studio | Book Your Makeup Session" />

            <div className="flex min-h-screen flex-col bg-[#F2F5F8] text-[#1F2D40]">
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#D3DFEF] bg-[#F2F5F8]/90 px-8 py-4 backdrop-blur">
                    <a href="#top" className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-[#5F83AB]" />
                        <span className="font-display text-lg font-bold text-[#5F83AB]">
                            JM Makeup Studio
                        </span>
                    </a>

                    <nav className="hidden items-center gap-8 text-sm text-[#5B6B82] md:flex">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="transition-colors duration-200 hover:text-[#5F83AB]"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex gap-3">
                        {isLoggedIn ? (
                            <Link
                                href={dashboard()}
                                className="rounded-full bg-[#5F83AB] px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#4E7099]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="rounded-full border border-[#95B1DB] px-4 py-1.5 text-sm text-[#5F83AB] transition-colors duration-200 hover:bg-[#E6EEF8]"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={register()}
                                    className="rounded-full bg-[#5F83AB] px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#4E7099]"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </header>

                <main id="top" className="flex-1">
                    <section className="mx-auto grid max-w-6xl items-center gap-14 px-8 py-16 lg:grid-cols-2 lg:py-24">
                        <div>
                            <p className="mb-4 text-sm font-medium text-[#4A6A93]">
                                Look good. Feel radiant.
                            </p>
                            <h2 className="font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
                                Makeup for the day you want to remember
                            </h2>
                            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#5B6B82]">
                                Pick a service, choose a time, and your artist confirms. Share photos of the
                                look you have in mind and show up ready.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link href={bookHref} className={primaryBtn}>
                                    {isLoggedIn ? 'Book a session' : 'Book now'}
                                </Link>
                                {artist && (
                                    <a href="#artist" className={secondaryBtn}>
                                        Meet your Artist
                                    </a>
                                )}
                            </div>

                            <ul className="mt-10 grid gap-2.5 text-sm text-[#5B6B82]">
                                <li className="flex items-center gap-2">
                                    <BadgeCheck className="h-4 w-4 text-[#5F83AB]" />
                                    Professional makeup artist
                                </li>
                                <li className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[#5F83AB]" />
                                    Taken times are blocked automatically
                                </li>
                                <li className="flex items-center gap-2">
                                    <CalendarCheck className="h-4 w-4 text-[#5F83AB]" />
                                    Reschedule from your account
                                </li>
                            </ul>
                        </div>

                        <div className="relative mx-auto h-[400px] w-full max-w-md sm:h-[480px]">
                            <div className="absolute right-6 top-6 h-56 w-56 rounded-full bg-[#D3DFEF]/60" />
                            <div className="absolute left-0 top-0 z-10 h-[84%] w-[60%] overflow-hidden rounded-t-full rounded-b-2xl border-4 border-white shadow-xl shadow-[#95B1DB]/40">
                                <Photo src={HERO_PHOTOS[0]} alt="Makeup look" />
                            </div>
                            <div className="absolute bottom-0 right-0 z-10 h-[58%] w-[48%] overflow-hidden rounded-t-full rounded-b-2xl border-4 border-white shadow-xl shadow-[#95B1DB]/40">
                                <Photo src={HERO_PHOTOS[1]} alt="Makeup look" />
                            </div>
                            <div className="absolute bottom-3 left-2 z-20 flex max-w-[12rem] items-start gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-lg shadow-[#95B1DB]/40">
                                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#5F83AB]" />
                                <span>Your artist confirms every booking</span>
                            </div>
                        </div>
                    </section>

                    <section id="services" className="scroll-mt-20 bg-[#E6EEF8]/70 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading
                                title="Services"
                                sub="Explore the active services currently offered by your artist."
                            />
                            <div className="divide-y divide-[#95B1DB]/50 border-y border-[#95B1DB]/50">
                                {services.map((service) => (
                                    <div
                                        key={service.id}
                                        className="grid items-center gap-3 py-6 sm:grid-cols-[2fr_3fr_auto] sm:gap-8"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Brush className="h-5 w-5 shrink-0 text-[#5F83AB]" />
                                            <div>
                                                <h4 className="font-display text-2xl font-bold">
                                                    {service.name}
                                                </h4>
                                                <p className="text-sm font-semibold text-[#4A6A93]">
                                                    ₱
                                                    {Number(service.price).toLocaleString('en-PH', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[#5B6B82]">
                                            {service.description || 'Ask your artist for service details.'}
                                        </p>
                                        <Link
                                            href={bookHref}
                                            className="text-sm font-semibold text-[#4A6A93] underline underline-offset-4 transition-colors duration-200 hover:text-[#5F83AB]"
                                        >
                                            Book this service
                                        </Link>
                                    </div>
                                ))}
                                {services.length === 0 && (
                                    <p className="py-6 text-sm text-[#5B6B82]">
                                        Services will appear here when the artist adds them.
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section id="how-it-works" className="scroll-mt-20 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading title="From booking to glam in four steps" />
                            <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="absolute left-5 right-5 top-5 hidden h-px bg-[#95B1DB] lg:block" />
                                {STEPS.map((step, index) => (
                                    <div key={step.title} className="relative">
                                        <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#5F83AB] text-sm font-semibold text-white ring-8 ring-[#F2F5F8]">
                                            {index + 1}
                                        </div>
                                        <p className="font-display text-xl font-bold">{step.title}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#5B6B82]">
                                            {step.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {artist && (
                        <section
                            id="artist"
                            className="scroll-mt-20 bg-[#E6EEF8]/70 px-8 py-20"
                        >
                            <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-[22rem_1fr]">
                                <div className="relative mx-auto w-full max-w-sm">
                                    <div className="absolute -right-5 -top-5 h-56 w-56 rounded-full bg-[#D3DFEF]/80" />
                                    <div className="relative z-10 aspect-[3/4] overflow-hidden rounded-t-full rounded-b-3xl border-4 border-white bg-[#D3DFEF] shadow-xl shadow-[#95B1DB]/40">
                                        {ARTIST_PHOTO ? (
                                            <img
                                                src={ARTIST_PHOTO}
                                                alt={artist.name}
                                                className="h-full w-full object-cover object-left"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <span className="font-display text-7xl font-bold text-[#5F83AB]">
                                                    {initials}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {artist.years_experience != null && (
                                        <div className="absolute -bottom-4 -left-3 z-20 rounded-xl bg-white px-5 py-3 shadow-lg shadow-[#95B1DB]/40">
                                            <p className="font-display text-3xl font-bold leading-none text-[#4A6A93]">
                                                {artist.years_experience}
                                            </p>
                                            <p className="mt-1 text-xs text-[#5B6B82]">
                                                {artist.years_experience === 1 ? 'year' : 'years'} of experience
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-[#4A6A93]">Meet your artist</p>
                                    <h3 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">
                                        {artist.name}
                                    </h3>
                                    <p className="mt-2 text-lg text-[#4A6A93]">
                                        {artist.specialty ?? 'Makeup artist'}
                                    </p>

                                    {artist.bio && (
                                        <p className="mt-6 max-w-xl border-l-4 border-[#95B1DB] pl-5 font-display text-xl italic leading-relaxed text-[#1F2D40]">
                                            {artist.bio}
                                        </p>
                                    )}

                                    <div className="mt-8">
                                        <p className="mb-3 text-sm font-semibold">Services</p>
                                        <div className="flex flex-wrap gap-2">
                                            {services.map((service) => (
                                                <Link
                                                    key={service.id}
                                                    href={bookHref}
                                                    className="rounded-full border border-[#95B1DB] px-4 py-1.5 text-sm text-[#4A6A93] transition-colors duration-200 hover:bg-white"
                                                >
                                                    {service.name}
                                                </Link>
                                            ))}
                                            {services.length === 0 && (
                                                <p className="text-sm text-[#5B6B82]">
                                                    No services listed yet.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-[#95B1DB]/50 pt-6">
                                        {artist.years_experience != null && (
                                            <div>
                                                <p className="font-display text-3xl font-bold text-[#4A6A93]">
                                                    {artist.years_experience}
                                                </p>
                                                <p className="text-sm text-[#5B6B82]">
                                                    {artist.years_experience === 1 ? 'year' : 'years'} in the craft
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-display text-3xl font-bold text-[#4A6A93]">
                                                {services.length}
                                            </p>
                                            <p className="text-sm text-[#5B6B82]">services offered</p>
                                        </div>
                                        <div>
                                            <p className="font-display text-3xl font-bold text-[#4A6A93]">1:1</p>
                                            <p className="text-sm text-[#5B6B82]">
                                                the same artist, every time
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex flex-wrap gap-3">
                                        <Link href={bookHref} className={primaryBtn}>
                                            Book with {firstName}
                                        </Link>
                                        <a href="#gallery" className={secondaryBtn}>
                                            See recent work
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    <section id="gallery" className="scroll-mt-20 px-8 pb-16">
                        <div className="mx-auto max-w-6xl">
                            <SectionHeading title="Recent work" />
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                {GALLERY.map((src, index) => (
                                    <div
                                        key={index}
                                        className="aspect-[4/5] overflow-hidden rounded-2xl border border-[#D3DFEF] bg-white"
                                    >
                                        <Photo src={src} alt={`Makeup look ${index + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {studioAddress && (
                        <section id="visit" className="px-8 pb-16">
                            <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 rounded-2xl border border-[#D3DFEF] bg-white p-6 md:flex-row md:items-center">
                                <div className="flex items-start gap-3">
                                    <MapPin className="mt-1 h-5 w-5 shrink-0 text-[#5F83AB]" />
                                    <div>
                                        <p className="font-semibold">Visit the studio</p>
                                        <p className="text-[#5B6B82]">{studioAddress}</p>
                                    </div>
                                </div>
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={secondaryBtn}
                                >
                                    Get directions
                                </a>
                            </div>
                        </section>
                    )}

                    <section className="bg-[#5F83AB] px-8 py-14 text-white">
                        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                            <div>
                                <h3 className="font-display text-3xl font-bold">
                                    Ready to book your session?
                                </h3>
                                <p className="mt-2 max-w-md text-white/90">
                                    It takes a minute. Your artist confirms the time with you.
                                </p>
                            </div>
                            <Link
                                href={bookHref}
                                className="whitespace-nowrap rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#4A6A93] transition-colors duration-200 hover:bg-[#F2F5F8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                {isLoggedIn ? 'Book a session' : 'Create your account'}
                            </Link>
                        </div>
                    </section>
                </main>

                <footer className="flex items-center justify-between border-t border-[#D3DFEF] px-8 py-6 text-sm text-[#5B6B82]">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#5F83AB]" />
                        <span className="font-semibold text-[#1F2D40]">JM Makeup Studio</span>
                    </div>
                    <span>© {new Date().getFullYear()} All rights reserved.</span>
                </footer>
            </div>
        </>
    );
}