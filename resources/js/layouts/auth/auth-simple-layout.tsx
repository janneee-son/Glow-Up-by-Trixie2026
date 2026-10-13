import { Link } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
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
        <div className="relative min-h-svh overflow-hidden bg-gradient-to-b from-[#E9F0F9] to-[#faf7f4]">

            {/* decorative blurred shapes, same treatment as the landing hero */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#c9a66b]/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#c9a66b]/30 blur-3xl" />

            {/* nav bar, matching the landing page */}
            <div className="relative border-b border-[#e8d7cf] bg-[#faf7f4]/80 backdrop-blur px-8 py-4 flex items-center justify-between">
                <Link href={home()} className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#8a6a2f]" />
                    <p className="font-bold text-[#8a6a2f]">Glow Up by Trixie</p>
                </Link>
                <Link
                    href={home()}
                    className="text-sm text-[#4a4a4a] hover:text-[#8a6a2f] transition-colors duration-200"
                >
                    ← Back to site
                </Link>
            </div>

            {/* card */}
            <div className="relative flex flex-col items-center justify-center px-6 py-16 md:py-24">
                <div
                    className={`w-full max-w-sm transition-all duration-500 ease-out ${
                        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                >
                    <div className="rounded-2xl border border-[#e8d7cf] bg-white p-8 shadow-lg shadow-[#c9a66b]/20">
                        {(title || description) && (
                            <div className="space-y-1 text-center mb-6">
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
