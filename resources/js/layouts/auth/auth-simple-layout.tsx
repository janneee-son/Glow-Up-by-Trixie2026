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
        <div className="relative min-h-svh overflow-hidden bg-gradient-to-b from-[#E9F0F9] to-[#F2F5F8]">

            {/* decorative blurred shapes, same treatment as the landing hero */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#95B1DB]/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-[#95B1DB]/30 blur-3xl" />

            {/* nav bar, matching the landing page */}
            <div className="relative border-b border-[#D3DFEF] bg-[#F2F5F8]/80 backdrop-blur px-8 py-4 flex items-center justify-between">
                <Link href={home()} className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#5F83AB]" />
                    <p className="font-bold text-[#5F83AB]">JM Makeup Studio</p>
                </Link>
                <Link
                    href={home()}
                    className="text-sm text-[#5B6B82] hover:text-[#5F83AB] transition-colors duration-200"
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
                    <div className="rounded-2xl border border-[#D3DFEF] bg-white p-8 shadow-lg shadow-[#95B1DB]/20">
                        {(title || description) && (
                            <div className="space-y-1 text-center mb-6">
                                {title && (
                                    <h1 className="text-lg font-semibold text-[#1F2D40]">
                                        {title}
                                    </h1>
                                )}
                                {description && (
                                    <p className="text-center text-sm text-[#5B6B82]">
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
