import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { BadgeCheck, Brush, CalendarCheck, Clock, Sparkles, X } from 'lucide-react';
import BehindTheGlow from '@/components/landing/BehindTheGlow';
import SocialLinks from '@/components/landing/SocialLinks';
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
    image_url: string | null;
};

type Package = {
    id: number;
    name: string;
    price: number | string | null;
    pricing_type: 'fixed' | 'starting_at' | 'quote_required';
    description: string | null;
    inclusions: string[] | null;
};

type GalleryImage = {
    id: number;
    caption: string | null;
    story: string | null;
    image_url: string;
};

type Props = {
    artist: Artist | null;
    services: Service[];
    packages?: Package[] | null;
    galleryImages?: GalleryImage[] | null;
    reviews?: { id: number; rating: number; comment: string; client: { name: string }; booking: { service: string } }[] | null;
};

/*
 * Brand palette (4 colors + 1 supporting neutral)
 *   ink        #0e0d0d  text, dark sections
 *   ivory      #FAF7F4  page background
 *   blush      #E8B4B8  soft accents, borders, hover
 *   champagne  #C9A66B  buttons, highlights
 *   muted text #0f0e0e  secondary copy
 * Darker accents for small text on light backgrounds (the bright ones are too faint to read):
 *   champagne-deep #8A6A2F, blush-deep #B9656D
 */

const NAV_LINKS = [
    { label: 'Services', href: '#services' },
    { label: 'Packages', href: '#packages' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Before you book', href: '#booking-details' },
    { label: 'Your artist', href: '#artist' },
    { label: 'Behind the glam', href: '#behind-the-glam' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Reviews', href: '#reviews' },
];

const STEPS = [
    { title: 'Choose', desc: 'Pick a service and tell us the occasion.' },
    { title: 'Book', desc: 'Select a date and time that works for you.' },
    { title: 'Get glammed', desc: 'Show up and let your artist work their magic.' },
    { title: 'Shine', desc: 'Walk out confident and camera-ready.' },
];

const ARTIST_PHOTOS = [
    {
        src: '/images/gallery/artist.png',
        alt: 'Trixie smiling in her makeup artist portrait',
        position: 'object-left',
    },
    {
        src: '/images/gallery/artist-lakeside.png',
        alt: 'Trixie smiling outdoors by the water',
        position: 'object-center',
    },
    {
        src: '/images/gallery/artist-evening.png',
        alt: 'Trixie posing in a red top at night',
        position: 'object-center',
    },
];

function SectionHeading({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-10 max-w-xl">
            <h3 className="font-display text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-4xl">{title}</h3>
            {sub && <p className="mt-3 leading-relaxed text-[#4A4A4A]">{sub}</p>}
        </div>
    );
}

const primaryBtn =
    'inline-flex items-center justify-center rounded-full bg-[#9A7430] px-7 py-3 text-sm font-semibold text-white shadow-md shadow-[#9A7430]/30 transition duration-200 hover:bg-[#A8545C] hover:shadow-[0_0_22px_rgba(168,84,92,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A6A2F]';

const secondaryBtn =
    'inline-flex items-center justify-center rounded-full border border-[#1A1A1A]/40 px-7 py-3 text-sm font-semibold text-[#1A1A1A] transition-colors duration-200 hover:bg-[#E8B4B8]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]';

export default function Welcome({ artist, services, packages: packagesProp, galleryImages: galleryImagesProp, reviews: reviewsProp }: Props) {
    const packages = Array.isArray(packagesProp) ? packagesProp : [];
    const galleryImages = Array.isArray(galleryImagesProp) ? galleryImagesProp : [];
    const reviews = Array.isArray(reviewsProp) ? reviewsProp : [];
    const [activeArtistPhotoIndex, setActiveArtistPhotoIndex] = useState(0);
    const [activeNavHref, setActiveNavHref] = useState<string | null>(null);
    const [selectedServiceImage, setSelectedServiceImage] = useState<{ src: string; alt: string; name: string } | null>(null);
    const [selectedGalleryImageId, setSelectedGalleryImageId] = useState<number | null>(null);
    const selectedGalleryImage = galleryImages.find((image) => image.id === selectedGalleryImageId) ?? null;

    const { auth } = usePage<{ auth?: { user?: unknown } }>().props;
    const isLoggedIn = Boolean(auth?.user);
    const bookHref = isLoggedIn ? dashboard() : register();

    const navLinks = NAV_LINKS.filter((link) => (link.href !== '#artist' || artist) && (link.href !== '#reviews' || reviews.length > 0));

    useEffect(() => {
        const availableHrefs = new Set(navLinks.map((link) => link.href));
        const updateFromHash = () => {
            const currentHref = window.location.hash;
            setActiveNavHref(availableHrefs.has(currentHref) ? currentHref : null);
        };

        updateFromHash();
        window.addEventListener('hashchange', updateFromHash);

        const sections = navLinks
            .map((link) => document.querySelector<HTMLElement>(link.href))
            .filter((section): section is HTMLElement => section !== null);

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleSections = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (first, second) =>
                            Math.abs(first.boundingClientRect.top - window.innerHeight * 0.2) -
                            Math.abs(second.boundingClientRect.top - window.innerHeight * 0.2),
                    );
                const visibleSection = visibleSections[0]?.target;

                if (visibleSection instanceof HTMLElement) {
                    setActiveNavHref(`#${visibleSection.id}`);
                }
            },
            { rootMargin: '-20% 0px -65% 0px' },
        );

        sections.forEach((section) => observer.observe(section));

        return () => {
            window.removeEventListener('hashchange', updateFromHash);
            observer.disconnect();
        };
    }, [artist, reviews.length]);

    useEffect(() => {
        const slideshowTimer = window.setInterval(() => {
            setActiveArtistPhotoIndex((currentIndex) => (currentIndex + 1) % ARTIST_PHOTOS.length);
        }, 5000);

        return () => window.clearInterval(slideshowTimer);
    }, []);

    useEffect(() => {
        if (selectedGalleryImageId === null && selectedServiceImage === null) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setSelectedGalleryImageId(null);
                setSelectedServiceImage(null);
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedGalleryImageId, selectedServiceImage]);

    const firstName = artist?.name.split(' ')[0] ?? '';
    const initials = artist
        ? artist.name
              .split(' ')
              .map((word) => word[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
        : '';

    return (
        <>
            <Head title="Glow Up by Trixie | Book Your Makeup Session" />

            <div className="flex min-h-screen flex-col bg-[#FAF7F4] text-[#1A1A1A]">
                <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E8B4B8]/50 bg-[#FAF7F4]/90 px-8 py-4 backdrop-blur">
                    <a href="#top" className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-[#8A6A2F]" />
                        <span className="font-display text-lg font-bold text-[#1A1A1A]">Glow Up by Trixie</span>
                    </a>

                    <nav className="hidden items-center gap-8 text-sm text-[#4A4A4A] md:flex">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                aria-current={activeNavHref === link.href ? 'location' : undefined}
                                onClick={() => setActiveNavHref(link.href)}
                                className={`transition-colors duration-200 hover:text-[#8A6A2F] ${
                                    activeNavHref === link.href ? 'font-medium text-[#8A6A2F]' : ''
                                }`}
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex gap-3">
                        {isLoggedIn ? (
                            <Link
                                href={dashboard()}
                                className="rounded-full bg-[#9A7430] px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#A8545C]"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="rounded-full border border-[#1A1A1A]/30 px-4 py-1.5 text-sm text-[#1A1A1A] transition-colors duration-200 hover:bg-[#E8B4B8]/25"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={register()}
                                    className="rounded-full bg-[#9A7430] px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#A8545C]"
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </header>

                <main id="top" className="flex-1">
                    {/* Artist banner: her name, tagline and contact details are already part of the image */}
                    <section aria-label="Glow Up by Trixie" className="gl-hero">
                        <picture>
                            <source media="(min-width: 768px)" srcSet="/images/landing/trixie-banner.webp" />
                            <img
                                className="gl-hero__img"
                                src="/images/landing/trixie-banner.webp"
                                alt="Glow Up by Trixie. Still you, just glowing. A makeup artist's brush kit and lit vanity mirror."
                                width={1402}
                                height={1122}
                                fetchPriority="high"
                            />
                        </picture>
                        <div className="gl-hero__bar">
                            <Link href={bookHref} className="gl-btn">
                                {isLoggedIn ? 'Book a session' : 'Book your glow'}
                            </Link>
                            <SocialLinks variant="light" className="mt-4" />
                        </div>
                    </section>

                    {/* Behind-the-scenes slideshow */}
                    <BehindTheGlow />

                    {/* First layout: text only, since the photos are already in the slideshow and Recent work */}
                    <section className="mx-auto grid max-w-6xl items-center gap-14 px-8 py-16 lg:grid-cols-2 lg:py-24">
                        <div>
                            <p className="mb-4 font-display text-xl italic text-[#8A6A2F]">Still you, just glowing.</p>
                            <h2 className="font-display text-4xl font-bold leading-[1.1] text-[#1A1A1A] sm:text-6xl">
                                Makeup that feels like{' '}
                                <span className="bg-gradient-to-r from-[#8A6A2F] to-[#B9656D] bg-clip-text text-transparent">
                                    you
                                </span>
                                , at your most radiant
                            </h2>
                            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#4A4A4A]">
                                Pick a service, choose a time, and your artist confirms. Share photos of the look you
                                have in mind and show up ready.
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

                            <ul className="mt-10 grid gap-2.5 text-sm text-[#4A4A4A]">
                                <li className="flex items-center gap-2">
                                    <BadgeCheck className="h-4 w-4 text-[#8A6A2F]" />
                                    Professional makeup artist
                                </li>
                                <li className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-[#8A6A2F]" />
                                    Taken times are blocked automatically
                                </li>
                                <li className="flex items-center gap-2">
                                    <CalendarCheck className="h-4 w-4 text-[#8A6A2F]" />
                                    Reschedule from your account
                                </li>
                            </ul>
                        </div>

                        <div className="relative mx-auto w-full max-w-md">
                            <div className="absolute -right-5 -top-5 h-48 w-48 rounded-full bg-[#E8B4B8]/40 blur-sm" />
                            <div className="relative rounded-[2rem] border border-[#E8B4B8]/60 bg-gradient-to-br from-white via-white to-[#E8B4B8]/20 p-8 shadow-xl shadow-[#C9A66B]/20 sm:p-10">
                                <Sparkles className="mb-6 h-9 w-9 text-[#C9A66B]" />
                                <p className="text-sm font-semibold text-[#8A6A2F]">Your look, your moment</p>
                                <h3 className="mt-3 font-display text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-4xl">
                                    Soft glam, thoughtfully made.
                                </h3>
                                <p className="mt-4 leading-relaxed text-[#4A4A4A]">
                                    From soft Korean and Thai-inspired makeup to natural glam, each look is tailored to
                                    bring out your own features.
                                </p>
                                <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                                    <BadgeCheck className="h-5 w-5 shrink-0 text-[#8A6A2F]" />
                                    <span className="text-sm font-semibold text-[#1A1A1A]">
                                        Your artist confirms every booking
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="services" className="scroll-mt-20 bg-[#E8B4B8]/15 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading
                                title="Services"
                                sub="Explore the active services currently offered by your artist."
                            />
                            <div className="divide-y divide-[#E8B4B8]/60 border-y border-[#E8B4B8]/60">
                                {services.map((service) => (
                                    <div
                                        key={service.id}
                                        className="grid items-center gap-3 py-6 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] sm:gap-8"
                                    >
                                        <div className="flex items-center gap-3">
                                            {service.image_url ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedServiceImage({
                                                            src: service.image_url!,
                                                            alt: `${service.name} makeup service`,
                                                            name: service.name,
                                                        })
                                                    }
                                                    aria-label={`View ${service.name} image`}
                                                    className="shrink-0 cursor-zoom-in rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8A6A2F]"
                                                >
                                                    <img
                                                        src={service.image_url}
                                                        alt={`${service.name} makeup service`}
                                                        className="h-20 w-20 rounded-2xl border border-[#C9A66B]/40 object-cover shadow-sm sm:h-24 sm:w-24"
                                                        loading="lazy"
                                                    />
                                                </button>
                                            ) : (
                                                <Brush className="h-5 w-5 shrink-0 text-[#8A6A2F]" />
                                            )}
                                            <div>
                                                <h4 className="font-display text-2xl font-bold">{service.name}</h4>
                                                <p className="text-sm font-semibold text-[#8A6A2F]">
                                                    ₱
                                                    {Number(service.price).toLocaleString('en-PH', {
                                                        minimumFractionDigits: 2,
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[#4A4A4A]">
                                            {service.description || 'Ask your artist for service details.'}
                                        </p>
                                        <Link
                                            href={bookHref}
                                            className="text-sm font-semibold text-[#1A1A1A] underline decoration-[#C9A66B] decoration-2 underline-offset-4 transition-colors duration-200 hover:text-[#8A6A2F]"
                                        >
                                            Book this service
                                        </Link>
                                    </div>
                                ))}
                                {services.length === 0 && (
                                    <p className="py-6 text-sm text-[#4A4A4A]">
                                        Services will appear here when the artist adds them.
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section id="packages" className="scroll-mt-20 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading
                                title="Packages"
                                sub="Choose a complete look package. Optional add-ons are available during booking."
                            />
                            {packages.length > 0 ? (
                                <div className="grid gap-5 md:grid-cols-2">
                                    {packages.map((pkg) => (
                                        <article
                                            key={pkg.id}
                                            className="rounded-3xl border border-[#E8B4B8]/60 bg-white p-6 shadow-sm"
                                        >
                                            <h4 className="font-display text-2xl font-bold">{pkg.name}</h4>
                                            <p className="mt-2 font-semibold text-[#8A6A2F]">
                                                {pkg.pricing_type === 'quote_required'
                                                    ? 'Price confirmed after booking'
                                                    : `${pkg.pricing_type === 'starting_at' ? 'Starting at ' : ''}₱${Number(pkg.price ?? 0).toLocaleString('en-PH')}`}
                                            </p>
                                            {pkg.description && (
                                                <p className="mt-3 text-sm leading-relaxed text-[#4A4A4A]">
                                                    {pkg.description}
                                                </p>
                                            )}
                                            {!!pkg.inclusions?.length && (
                                                <ul className="mt-4 grid gap-1 text-sm text-[#4A4A4A]">
                                                    {pkg.inclusions.map((item, index) => (
                                                        <li key={`${pkg.id}-${index}`} className="flex gap-2">
                                                            <span className="text-[#8A6A2F]">✓</span>
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <Link
                                                href={bookHref}
                                                className="mt-5 inline-flex text-sm font-semibold text-[#1A1A1A] underline decoration-[#C9A66B] decoration-2 underline-offset-4 transition-colors duration-200 hover:text-[#8A6A2F]"
                                            >
                                                Book this package
                                            </Link>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-2xl border border-dashed border-[#E8B4B8] bg-white/70 p-5 text-sm text-[#4A4A4A]">
                                    Packages will appear here when they are added by the artist.
                                </p>
                            )}
                        </div>
                    </section>

                    <section id="how-it-works" className="scroll-mt-20 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading title="From booking to glam in four steps" />
                            <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="absolute left-5 right-5 top-5 hidden h-px bg-[#E8B4B8] lg:block" />
                                {STEPS.map((step, index) => (
                                    <div key={step.title} className="relative">
                                        <div className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A] text-sm font-semibold text-[#C9A66B] ring-8 ring-[#FAF7F4]">
                                            {index + 1}
                                        </div>
                                        <p className="font-display text-xl font-bold">{step.title}</p>
                                        <p className="mt-1 text-sm leading-relaxed text-[#4A4A4A]">{step.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section id="booking-details" className="scroll-mt-20 bg-[#E8B4B8]/15 px-8 py-16">
                        <div className="mx-auto max-w-5xl">
                            <SectionHeading
                                title="Know what to expect before you book"
                                sub="A quick guide to deposits, payment, and final pricing. The full booking terms are shown in the request form before you submit."
                            />
                            <div className="grid gap-5 md:grid-cols-3">
                                <article className="rounded-2xl border border-[#E8B4B8]/60 bg-white p-5">
                                    <h4 className="font-display text-xl font-bold">Deposit & balance</h4>
                                    <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">
                                        A 50% down payment is required to reserve your preferred date and time. The remaining balance is due on your service day. The deposit is non-refundable once your booking is confirmed.
                                    </p>
                                </article>
                                <article className="rounded-2xl border border-[#E8B4B8]/60 bg-white p-5">
                                    <h4 className="font-display text-xl font-bold">Payment & confirmation</h4>
                                    <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">
                                        Pay by GCash or bank transfer. Your booking is confirmed after Trixie verifies the deposit; a preferred time may be released if the deposit is not settled by the required time.
                                    </p>
                                </article>
                                <article className="rounded-2xl border border-[#E8B4B8]/60 bg-white p-5">
                                    <h4 className="font-display text-xl font-bold">Final price & travel</h4>
                                    <p className="mt-2 text-sm leading-relaxed text-[#4A4A4A]">
                                        Some packages and add-ons need a custom quote. Travel fees are estimates until Trixie confirms them using your full venue address. Review the final quote before accepting it.
                                    </p>
                                </article>
                            </div>
                            <p className="mt-5 text-sm text-[#4A4A4A]">
                                Have a question first?{' '}
                                <a href="tel:09241013301" className="font-semibold text-[#8A6A2F] underline underline-offset-4">
                                    Call or text Trixie at 0924 101 3301
                                </a>
                                .
                            </p>
                        </div>
                    </section>

                    {artist && (
                        <section id="artist" className="scroll-mt-20 bg-[#E8B4B8]/15 px-8 py-20">
                            <div className="mx-auto grid max-w-5xl items-center gap-14 md:grid-cols-[22rem_1fr]">
                                <div className="relative mx-auto w-full max-w-sm">
                                    <div className="absolute -right-5 -top-5 h-56 w-56 rounded-full bg-[#C9A66B]/30" />
                                    <div className="relative z-10 aspect-[3/4] overflow-hidden rounded-t-full rounded-b-3xl border-4 border-white bg-[#E8B4B8]/40 shadow-xl shadow-[#C9A66B]/30">
                                        {ARTIST_PHOTOS.length > 0 ? (
                                            ARTIST_PHOTOS.map((photo, index) => {
                                                const isActive = index === activeArtistPhotoIndex;

                                                return (
                                                    <img
                                                        key={photo.src}
                                                        src={photo.src}
                                                        alt={isActive ? photo.alt : ''}
                                                        aria-hidden={!isActive}
                                                        className={`absolute inset-0 h-full w-full object-cover ${photo.position} transition-[opacity,transform] duration-1000 ease-in-out motion-reduce:transition-none ${
                                                            isActive ? 'scale-[1.06] opacity-100' : 'scale-100 opacity-0'
                                                        }`}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <span className="font-display text-7xl font-bold text-[#8A6A2F]">
                                                    {initials}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {artist.years_experience != null && (
                                        <div className="absolute -bottom-4 -left-3 z-20 rounded-xl bg-white px-5 py-3 shadow-lg shadow-[#C9A66B]/30">
                                            <p className="font-display text-3xl font-bold leading-none text-[#8A6A2F]">
                                                {artist.years_experience}
                                            </p>
                                            <p className="mt-1 text-xs text-[#4A4A4A]">
                                                {artist.years_experience === 1 ? 'year' : 'years'} of experience
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-[#8A6A2F]">Meet your artist</p>
                                    <h3 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">
                                        {artist.name}
                                    </h3>
                                    <p className="mt-2 text-lg text-[#8A6A2F]">{artist.specialty ?? 'Makeup artist'}</p>

                                    {artist.bio && (
                                        <p className="mt-6 max-w-xl border-l-4 border-[#C9A66B] pl-5 font-display text-xl italic leading-relaxed text-[#1A1A1A]">
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
                                                    className="rounded-full border border-[#1A1A1A]/30 px-4 py-1.5 text-sm text-[#1A1A1A] transition-colors duration-200 hover:bg-white"
                                                >
                                                    {service.name}
                                                </Link>
                                            ))}
                                            {services.length === 0 && (
                                                <p className="text-sm text-[#4A4A4A]">No services listed yet.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 grid max-w-lg grid-cols-3 gap-4 border-t border-[#E8B4B8]/60 pt-6">
                                        {artist.years_experience != null && (
                                            <div>
                                                <p className="font-display text-3xl font-bold text-[#8A6A2F]">
                                                    {artist.years_experience}
                                                </p>
                                                <p className="text-sm text-[#4A4A4A]">
                                                    {artist.years_experience === 1 ? 'year' : 'years'} in the craft
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-display text-3xl font-bold text-[#8A6A2F]">
                                                {services.length}
                                            </p>
                                            <p className="text-sm text-[#4A4A4A]">services offered</p>
                                        </div>
                                        <div>
                                            <p className="font-display text-3xl font-bold text-[#8A6A2F]">1:1</p>
                                            <p className="text-sm text-[#4A4A4A]">the same artist, every time</p>
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

                    <section id="gallery" className="scroll-mt-20 px-8 py-16">
                        <div className="mx-auto max-w-6xl">
                            <SectionHeading title="Recent work" />
                            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4">
                                {galleryImages.map((image) => (
                                    <button
                                        key={image.id}
                                        type="button"
                                        onClick={() => setSelectedGalleryImageId(image.id)}
                                        aria-label={`View ${image.caption || 'makeup look'} and its story`}
                                        className="w-[75%] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#E8B4B8]/60 bg-white sm:w-[40%] lg:w-[24%]"
                                    >
                                        <img
                                            src={image.image_url}
                                            alt={image.caption || 'Makeup work'}
                                            className="aspect-[4/5] w-full object-cover"
                                        />
                                        <span className="flex items-center justify-between gap-2 px-3 py-2 text-left text-sm text-[#4A4A4A]">
                                            <span className="truncate">{image.caption || 'Makeup look'}</span>
                                            <span className="shrink-0 text-xs font-semibold text-[#8A6A2F]">Read story</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {reviews.length > 0 && (
                        <section id="reviews" className="scroll-mt-20 bg-[#E8B4B8]/15 px-8 py-16">
                            <div className="mx-auto max-w-6xl">
                                <SectionHeading title="Kind words from clients" sub="Shared by clients after their completed glam sessions." />
                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {reviews.map((review) => (
                                        <article key={review.id} className="rounded-3xl border border-[#E8B4B8]/60 bg-white p-6 shadow-sm">
                                            <p className="text-lg tracking-widest text-[#8A6A2F]" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</p>
                                            <blockquote className="mt-3 whitespace-pre-line text-sm leading-6 text-[#4A4A4A]">“{review.comment}”</blockquote>
                                            <p className="mt-5 border-t border-[#E8B4B8]/40 pt-4 text-sm font-semibold text-[#1A1A1A]">{review.client.name}</p>
                                            <p className="mt-1 text-xs text-[#6b625a]">Verified client · {review.booking.service}</p>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="bg-[#1A1A1A] px-8 py-14 text-[#FAF7F4]">
                        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                            <div>
                                <h3 className="font-display text-3xl font-bold">Ready to book your session?</h3>
                                <p className="mt-2 max-w-md text-[#FAF7F4]/85">
                                    It takes a minute. Your artist confirms the time with you.
                                </p>
                            </div>
                            <Link href={bookHref} className="gl-btn whitespace-nowrap">
                                {isLoggedIn ? 'Book a session' : 'Create your account'}
                            </Link>
                        </div>
                    </section>
                </main>

                <footer className="flex flex-col gap-4 border-t border-[#C9A66B]/30 bg-[#1A1A1A] px-8 py-6 text-sm text-[#FAF7F4]/80 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#C9A66B]" />
                        <span className="font-semibold text-[#FAF7F4]">Glow Up by Trixie</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <SocialLinks variant="dark" showPhone />
                        <span>© {new Date().getFullYear()} All rights reserved.</span>
                    </div>
                </footer>

                {selectedServiceImage && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/90 p-4 backdrop-blur-sm"
                        onClick={() => setSelectedServiceImage(null)}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-label={selectedServiceImage.name}
                            className="relative flex h-[92vh] w-full max-w-6xl items-center justify-center overflow-hidden rounded-2xl border border-[#C9A66B]/40 bg-[#1A1A1A] shadow-2xl"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedServiceImage(null)}
                                aria-label="Close image"
                                className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-[#9A7430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <img
                                src={selectedServiceImage.src}
                                alt={selectedServiceImage.alt}
                                className="h-full w-full object-contain"
                            />
                        </section>
                    </div>
                )}

                {selectedGalleryImage && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/80 p-4 backdrop-blur-sm"
                        onClick={() => setSelectedGalleryImageId(null)}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="gallery-story-title"
                            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#C9A66B]/40 bg-[#FAF7F4] shadow-2xl md:grid md:grid-cols-[1.05fr_0.95fr]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setSelectedGalleryImageId(null)}
                                aria-label="Close story"
                                className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#1A1A1A]/75 text-white transition hover:bg-[#9A7430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            <div className="h-[42vh] shrink-0 bg-[#1A1A1A] md:h-[82vh] md:min-h-0">
                                <img
                                    src={selectedGalleryImage.image_url}
                                    alt={selectedGalleryImage.caption || 'Makeup look by Trixie'}
                                    className="h-full max-h-full w-full object-contain"
                                />
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8 md:self-center md:p-10">
                                <p className="text-xs font-semibold tracking-[0.18em] text-[#8A6A2F] uppercase">Recent work · behind the look</p>
                                <h2 id="gallery-story-title" className="mt-3 font-display text-3xl font-bold text-[#1A1A1A] sm:text-4xl">
                                    {selectedGalleryImage.caption || 'A closer look'}
                                </h2>
                                {selectedGalleryImage.story ? (
                                    <p className="mt-5 whitespace-pre-line text-base leading-7 text-[#4A4A4A]">{selectedGalleryImage.story}</p>
                                ) : (
                                    <p className="mt-5 text-sm leading-6 text-[#4A4A4A]">Trixie hasn’t added a story for this look yet.</p>
                                )}
                                <p className="mt-8 border-t border-[#C9A66B]/40 pt-5 text-sm font-medium text-[#8A6A2F]">Glow Up by Trixie</p>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </>
    );
}
