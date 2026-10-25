import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    // simple mount-in transition so the card doesn't just snap into place
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));

        return () => cancelAnimationFrame(id);
    }, []);

    return (
        <div className="relative min-h-svh overflow-hidden bg-[#faf7f4]"
            style={{
                backgroundImage: "url('/images/branding/auth-brush-background.svg'), linear-gradient(180deg, #E9F0F9 0%, #faf7f4 100%)",
                backgroundPosition: "center, center",
                backgroundSize: "100% 100%, cover",
                backgroundRepeat: "no-repeat, no-repeat",
            }}>
            {/* decorative blurred shapes, same treatment as the landing hero */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#c9a66b]/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-[#c9a66b]/30 blur-3xl" />




            {/* nav bar, matching the landing page */}
            <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#E8B4B8]/50 bg-[#FAF7F4]/90 px-4 py-3 backdrop-blur sm:px-8 sm:py-4">
                <Link
                    href={home()}
                    className="flex min-w-0 items-center gap-2"
                >
                    <AppLogoIcon className="h-10 w-10 object-contain" />
                    <p className="whitespace-nowrap font-display text-sm font-bold text-[#1A1A1A] sm:text-lg">
                        Glow Up by Trixie
                    </p>
                </Link>
                <Link
                    href={home()}
                    className="text-sm text-[#4a4a4a] transition-colors duration-200 hover:text-[#8a6a2f]"
                >
                    ← Back to site
                </Link>
            </div>

            {/* card */}
            <div className="relative z-10 flex flex-col items-center justify-center px-6 py-16 md:py-24">
                <div
                    className={`w-full max-w-sm transition-all duration-500 ease-out ${
                        mounted
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-4 opacity-0'
                    }`}
                >
                    <div className="rounded-2xl border border-[#e8d7cf] bg-white p-8 shadow-lg shadow-[#c9a66b]/20">
                        {(title || description) && (
                            <div className="mb-6 space-y-1 text-center">
                                {title && (
                                    <h1 className="text-lg font-semibold text-[#1a1a1a]">
                                        {title}
                                    </h1>
                                )}
                                {description && (
                                    <p className="text-center text-sm text-[#4a4a4a]">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
