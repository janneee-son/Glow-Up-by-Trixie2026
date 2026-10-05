import { Head, Link, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Brush,
    CalendarCheck,
    Camera,
    Clock,
    Gem,
    ImagePlus,
    Palette,
    ShieldCheck,
    Sparkles,
    Star,
    type LucideIcon,
} from 'lucide-react';
import { dashboard, login, register } from '@/routes';

type Artist = {
    name: string;
    specialty: string | null;
    years_experience: number | null;
    bio: string | null;
};

type Props = {
    artist: Artist | null;
};

/* ---------- content ---------- */

const NAV_LINKS = [
    { label: 'Services', href: '#services' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Your artist', href: '#artist' },
    { label: 'Gallery', href: '#gallery' },
];

const SERVICES: { icon: LucideIcon; name: string; desc: string }[] = [
    { icon: Brush, name: 'Everyday Glam', desc: 'Light, natural makeup for daily wear.' },
    { icon: Gem, name: 'Bridal Makeup', desc: 'Flawless looks for your big day.' },
    { icon: Palette, name: 'Photoshoot Glam', desc: 'Camera-ready, full coverage looks.' },
    { icon: Star, name: 'Special Events', desc: 'Proms, parties, and everything between.' },
];

const STEPS = [
    { title: 'Choose', desc: 'Pick a service and tell us the occasion.' },
    { title: 'Book', desc: 'Select a date and time that works for you.' },
    { title: 'Get glammed', desc: 'Show up and let your artist work their magic.' },
    { title: 'Shine', desc: 'Walk out confident and camera-ready.' },
];

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: ImagePlus, title: 'Share your inspiration', desc: 'Upload reference photos so your artist knows the look you want.' },
    { icon: Clock, title: 'Real-time availability', desc: 'Times that are already taken are blocked, so there is no back-and-forth.' },
    { icon: CalendarCheck, title: 'Easy rescheduling', desc: 'Change or cancel your booking anytime from your account.' },
    { icon: ShieldCheck, title: 'Secure booking', desc: 'Your details and reservations are safely stored.' },
];

// Replace `null` with an image path, e.g. '/images/gallery/look-1.jpg'
const GALLERY: (string | null)[] = [
    '/images/gallery/image1.jpg',
    '/images/gallery/image2.jpg',
    '/images/gallery/image3.png',
    '/images/gallery/image4.png',
];

/* ---------- small pieces ---------- */

function Photo({ src, alt }: { src: string | null | undefined; alt: string }) {
    if (src) return <img src={src} alt={alt} className="h-full w-full object-cover" />;

    return (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#FCE4EC] to-[#F7C6D9] text-[#E75480]/60">
            <Camera className="h-8 w-8" />
        </div>
    );
}

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-10 max-w-xl">
            <h3 className="font-display text-3xl font-bold leading-tight text-[#4A2C33] sm:text-4xl">{title}</h3>
            {sub && <p className="mt-3 leading-relaxed text-[#7A5560]">{sub}</p>}
        </div>
    );
}

const primaryBtn =
    'inline-flex items-center justify-center rounded-full bg-[#E75480] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-[#F3A6C0]/50 transition-colors duration-200 hover:bg-[#D63F6E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E75480]';

const secondaryBtn =
    'inline-flex items-center justify-center rounded-full border border-[#E75480]/50 px-7 py-3 text-sm font-semibold text-[#B9426A] transition-colors duration-200 hover:bg-[#FCE4EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E75480]';

/* ---------- page ---------- */

export default function Welcome({ artist }: Props) {
    const { auth } = usePage<{ auth?: { user?: unknown } }>().props;
    const isLoggedIn = Boolean(auth?.user);
    const bookHref = isLoggedIn ? dashboard() : register();

    // hide the "Your artist" link while there is no artist account yet
    const navLinks = NAV_LINKS.filter((link) => link.href !== '#artist' || artist);

    const firstName = artist?.name.split(' ')[0] ?? '';
    const initials = artist
        ? artist.name
              .split(' ')
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : '';

    return (
        <>
            <Head title="Prishana Aesthetics | Book Your Makeup Session" />

            <div className="flex min-h-screen flex-col bg-[#FFF5F7] text-[#4A2C33]">
                {/* nav */}
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#F7C6D9] bg-[#FFF5F7]/90 px-8 py-4 backdrop-blur">
                    <a href="#top" className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-[#E75480]" />
                        <span className="font-display text-lg font-bold text-[#E75480]">Prishana Aesthetics</span>
                    </a>

                    <nav className="hidden items-center gap-8 text-sm text-[#7A5560] md:flex">
                        {navLinks.map((link) => (
                            <a key={link.href} href={link.href} className="transition-colors duration-200 hover:text-[#E75480]">
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex gap-3">
                        {isLoggedIn ? (
                            <Link
                                href={dashboard()}
                                className="rounded-full bg-[#E75480] px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#D63F6E]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="rounded-full border border-[#F3A6C0] px-4 py-1.5 text-sm text-[#E75480] transition-colors duration-200 hover:bg-[#FCE4EC]"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={register()}
                                    className="rounded-full bg-[#E75480] px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#D63F6E]"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </header>

                <main id="top" className="flex-1">
                    {/* hero */}
                    <section className="mx-auto grid max-w-6xl items-center gap-14 px-8 py-16 lg:grid-cols-2 lg:py-24">
                        <div>
                            <p className="mb-4 text-sm font-medium text-[#B9426A]">Look good. Feel radiant.</p>
                            <h2 className="font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
                                Makeup for the day you want to remember
                            </h2>
                            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#7A5560]">
                                Pick a service, choose a time, and your artist confirms. Share photos of the look you have in mind and
                                show up ready.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link href={bookHref} className={primaryBtn}>
                                    {isLoggedIn ? 'Book a session' : 'Book now'}
                                </Link>
                                {artist && (
                                    <a href="#artist" className={secondaryBtn}>
                                        Meet {firstName}
                                    </a>
                                )}
                            </div>

                            <ul className="mt-10 grid gap-2.5 text-sm text-[#7A5560]">
                                <li className="flex items-center gap-2">
                                    <BadgeCheck className="h-4 w-4 text-[#E75480]" /> Professional makeup artist
                                </li>
                                <li className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[#E75480]" /> Taken times are blocked automatically
                                </li>
                                <li className="flex items-center gap-2">
                                    <CalendarCheck className="h-4 w-4 text-[#E75480]" /> Reschedule from your account
                                </li>
                            </ul>
                        </div>

                        {/* arch-framed photos */}
                        <div className="relative mx-auto h-[400px] w-full max-w-md sm:h-[480px]">
                            <div className="absolute right-6 top-6 h-56 w-56 rounded-full bg-[#F7C6D9]/60" />
                            <div className="absolute left-0 top-0 z-10 h-[84%] w-[60%] overflow-hidden rounded-t-full rounded-b-2xl border-4 border-white shadow-xl shadow-[#F3A6C0]/40">
                                <Photo src={GALLERY[0]} alt="Makeup look" />
                            </div>
                            <div className="absolute bottom-0 right-0 z-10 h-[58%] w-[48%] overflow-hidden rounded-t-full rounded-b-2xl border-4 border-white shadow-xl shadow-[#F3A6C0]/40">
                                <Photo src={GALLERY[1]} alt="Makeup look" />
                            </div>
                            <div className="absolute bottom-3 left-2 z-20 flex max-w-[12rem] items-start gap-2 rounded-xl bg-white px-4 py-3 text-sm shadow-lg shadow-[#F3A6C0]/40">
                                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#E75480]" />
                                <span>Your artist confirms every booking</span>
                            </div>
                        </div>
                    </section>

                    {/* services */}
                    <section id="services" className="scroll-mt-20 bg-[#FCE4EC]/70 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading title="Services" sub="Four ways to book. Tell us the occasion when you reserve and your artist plans the look." />
                            <div className="divide-y divide-[#F3A6C0]/50 border-y border-[#F3A6C0]/50">
                                {SERVICES.map(({ icon: Icon, name, desc }) => (
                                    <div key={name} className="grid items-center gap-3 py-6 sm:grid-cols-[2fr_3fr_auto] sm:gap-8">
                                        <div className="flex items-center gap-3">
                                            <Icon className="h-5 w-5 shrink-0 text-[#E75480]" />
                                            <h4 className="font-display text-2xl font-bold">{name}</h4>
                                        </div>
                                        <p className="text-[#7A5560]">{desc}</p>
                                        <Link
                                            href={bookHref}
                                            className="text-sm font-semibold text-[#B9426A] underline underline-offset-4 transition-colors duration-200 hover:text-[#E75480]"
                                        >
                                            Book this service
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* how it works */}
                    <section id="how-it-works" className="scroll-mt-20 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading title="From booking to glam in four steps" />
                            <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="absolute left-5 right-5 top-5 hidden h-px bg-[#F3A6C0] lg:block" />
                                {STEPS.map((step, i) => (
                                    <div key={step.title} className="relative">
                                        <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#E75480] text-sm font-semibold text-white ring-8 ring-[#FFF5F7]">
                                            {i + 1}
                                        </div>
                                        <p className="font-display text-xl font-bold">{step.title}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#7A5560]">{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* your artist (only shown once the artist account exists) */}
                    {artist && (
                        <section id="artist" className="scroll-mt-20 bg-[#FCE4EC]/70 px-8 py-16">
                            <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[auto_1fr]">
                                <div className="mx-auto flex h-80 w-60 items-center justify-center rounded-t-full rounded-b-2xl border-4 border-white bg-gradient-to-b from-[#F7C6D9] to-[#FCE4EC] shadow-xl shadow-[#F3A6C0]/40">
                                    <span className="font-display text-6xl font-bold text-[#E75480]">{initials}</span>
                                </div>
                                <div>
                                    <h3 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Meet {artist.name}</h3>
                                    <p className="mt-2 text-[#B9426A]">
                                        {artist.specialty ?? 'Makeup artist'}
                                        {artist.years_experience != null &&
                                            `, ${artist.years_experience} ${artist.years_experience === 1 ? 'year' : 'years'} of experience`}
                                    </p>
                                    {artist.bio && <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#7A5560]">{artist.bio}</p>}
                                    <Link href={bookHref} className={`${primaryBtn} mt-7`}>
                                        Book with {firstName}
                                    </Link>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* why book with us */}
                    <section className="px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading title="Booking that stays out of your way" />
                            <div className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
                                {FEATURES.map(({ icon: Icon, title, desc }) => (
                                    <div key={title} className="flex gap-4">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FCE4EC] text-[#E75480]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{title}</p>
                                            <p className="mt-1 text-sm leading-relaxed text-[#7A5560]">{desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* gallery */}
                    <section id="gallery" className="scroll-mt-20 px-8 pb-16">
                        <div className="mx-auto max-w-6xl">
                            <SectionHeading title="Recent work" />
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {GALLERY.map((src, i) => (
                                    <div
                                        key={i}
                                        className={`overflow-hidden rounded-2xl border border-[#F7C6D9] bg-white ${
                                            i === 0
                                                ? 'col-span-2 aspect-square md:row-span-2 md:aspect-auto'
                                                : i === 3
                                                  ? 'col-span-2 aspect-[2/1]'
                                                  : 'aspect-square'
                                        }`}
                                    >
                                        <Photo src={src} alt={`Makeup look ${i + 1}`} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* closing call to action */}
                    <section className="bg-[#E75480] px-8 py-14 text-white">
                        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                            <div>
                                <h3 className="font-display text-3xl font-bold">Ready to book your session?</h3>
                                <p className="mt-2 max-w-md text-white/90">It takes a minute. Your artist confirms the time with you.</p>
                            </div>
                            <Link
                                href={bookHref}
                                className="whitespace-nowrap rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#B9426A] transition-colors duration-200 hover:bg-[#FFF5F7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                {isLoggedIn ? 'Book a session' : 'Create your account'}
                            </Link>
                        </div>
                    </section>
                </main>

                {/* footer */}
                <footer className="flex items-center justify-between border-t border-[#F7C6D9] px-8 py-6 text-sm text-[#7A5560]">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#E75480]" />
                        <span className="font-semibold text-[#4A2C33]">Prishana Aesthetics</span>
                    </div>
                    <span>© {new Date().getFullYear()} All rights reserved.</span>
                </footer>
            </div>
        </>
    );
}
