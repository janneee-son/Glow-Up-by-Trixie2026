import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import DashboardHeader from '@/components/dashboard-header';

type InspoImage = {
    id: number;
    url: string;
    caption: string | null;
};

type Props = {
    clientName: string;
    images: InspoImage[];
};

export default function ClientInspoHistory({ clientName, images }: Props) {
    const { auth } = usePage<{ auth?: { user?: { name?: string; role?: 'client' | 'artist' | 'admin' } } }>().props;

    return (
        <>
            <Head title={`${clientName}'s Inspiration History`} />
            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader userName={auth?.user?.name ?? 'there'} userRole={auth?.user?.role} active="book" />
                <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 md:py-10">
                    <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#8a6a2f] hover:underline">
                        <ArrowLeft className="h-4 w-4" /> Back to schedule
                    </Link>
                    <section className="mb-6 rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">Client makeup inspiration</p>
                        <h1 className="font-serif text-3xl font-bold text-[#1a1a1a]">{clientName}&apos;s inspiration history</h1>
                        <p className="mt-2 text-sm leading-6 text-[#4a4a4a]">Only the history for this client is shown here.</p>
                    </section>
                    {images.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {images.map((image) => (
                                <figure key={image.id} className="overflow-hidden rounded-2xl border border-[#e8d7cf] bg-white shadow-sm">
                                    <img src={image.url} alt={image.caption ?? `${clientName}'s makeup inspiration`} className="aspect-square w-full object-cover" />
                                    {image.caption && <figcaption className="px-3 py-2 text-sm text-[#4a4a4a]">{image.caption}</figcaption>}
                                </figure>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#d7c0a2] bg-white/80 px-6 py-16 text-center shadow-sm">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4e9e5] text-[#8a6a2f]">
                                <Sparkles className="h-7 w-7" />
                            </span>
                            <p className="font-serif text-lg font-bold text-[#1a1a1a]">No inspiration images yet</p>
                            <p className="max-w-xs text-sm text-[#4a4a4a]">This client has not added any images to their inspiration history.</p>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
