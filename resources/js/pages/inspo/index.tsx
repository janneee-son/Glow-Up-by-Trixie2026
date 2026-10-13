import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ImagePlus, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';

type InspoImage = {
    id: number;
    url: string;
    caption: string | null;
};

type Props = {
    images: InspoImage[];
};

export default function InspoIndex({ images }: Props) {
    const { auth } = usePage<{ auth?: { user?: { name?: string } } }>().props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(
        null,
    );
    const [viewingImage, setViewingImage] = useState<InspoImage | null>(null);
    const [justUploaded, setJustUploaded] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<{
        images: File[];
        caption: string;
    }>({
        images: [],
        caption: '',
    });

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []);
        setData('images', files);
        setPreviews(files.map((f) => URL.createObjectURL(f)));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (data.images.length === 0) return;
        post('/inspo', {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setPreviews([]);
                setJustUploaded(true);
                setTimeout(() => setJustUploaded(false), 2500);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    }

    function handleDelete(id: number) {
        router.delete(`/inspo/${id}`, {
            preserveScroll: true,
            onFinish: () => setConfirmingDeleteId(null),
        });
    }

    useEffect(() => {
        if (!viewingImage) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setViewingImage(null);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewingImage]);

    return (
        <>
            <Head title="Inspiration History" />

            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    active="inspo"
                />

                <main className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#e8d7cf]/50 blur-2xl" />
                        <div className="relative">
                            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                Makeup Inspiration
                            </p>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                                Your Inspiration History
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                                This collection is saved to your profile and
                                available every time you book a session.
                            </p>
                        </div>
                    </section>

                    {/* upload form */}
                    <form
                        onSubmit={handleSubmit}
                        className="mb-8 rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-lg shadow-[#c9a66b]/10 sm:p-6"
                    >
                        <div className="sm:flex sm:items-center sm:gap-4">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleFileChange}
                                className="hidden"
                                id="inspo-upload"
                            />

                            {previews.length > 0 ? (
                                <div className="mb-3 flex gap-1.5 sm:mb-0">
                                    {previews.slice(0, 3).map((src, i) => (
                                        <img
                                            key={i}
                                            src={src}
                                            alt="Preview"
                                            className="h-16 w-16 rounded-lg object-cover"
                                        />
                                    ))}
                                    {previews.length > 3 && (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#f4e9e5] text-xs font-semibold text-[#8a6a2f]">
                                            +{previews.length - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <label
                                    htmlFor="inspo-upload"
                                    className="mb-3 flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#c9a66b] text-[#8a6a2f] transition hover:bg-[#f4e9e5]/50 sm:mb-0"
                                >
                                    <ImagePlus className="h-6 w-6" />
                                </label>
                            )}

                            <div className="flex-1">
                                <label
                                    htmlFor="inspo-upload"
                                    className="mb-2 block cursor-pointer text-sm font-semibold text-[#1a1a1a]"
                                >
                                    {data.images.length > 0
                                        ? `${data.images.length} image${data.images.length > 1 ? 's' : ''} selected`
                                        : '+ Upload Inspiration (choose one or more)'}
                                </label>
                                <input
                                    type="text"
                                    value={data.caption}
                                    onChange={(e) =>
                                        setData('caption', e.target.value)
                                    }
                                    placeholder="Add a short caption (optional)"
                                    maxLength={100}
                                    className="w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#6b625a] focus-visible:border-[#8a6a2f] focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30 focus-visible:outline-none"
                                />
                                {errors.images && (
                                    <p className="mt-1 text-xs text-[#A13F3F]">
                                        {errors.images}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={
                                    data.images.length === 0 || processing
                                }
                                className="mt-3 w-full rounded-full bg-[#8a6a2f] text-white shadow-md shadow-[#8a6a2f]/25 transition hover:bg-[#8a6a2f] disabled:opacity-50 sm:mt-0 sm:w-auto"
                            >
                                <Upload className="h-4 w-4" />{' '}
                                {processing ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>

                        {justUploaded && (
                            <p className="mt-3 text-sm font-medium text-[#2E7D46]">
                                Added to your inspiration history!
                            </p>
                        )}
                    </form>

                    {/* history */}
                    {images.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[#d7c0a2] bg-white/80 px-6 py-16 text-center shadow-sm">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4e9e5] text-[#8a6a2f]">
                                <Sparkles className="h-7 w-7" />
                            </span>
                            <p className="font-serif text-lg font-bold text-[#1a1a1a]">
                                No inspiration images yet
                            </p>
                            <p className="max-w-xs text-sm text-[#4a4a4a]">
                                Upload a photo of a look you'd like to recreate
                                — it'll be here every time you book.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {images.map((img) => (
                                <div
                                    key={img.id}
                                    className="group relative overflow-hidden rounded-2xl border border-[#e8d7cf] bg-white shadow-sm shadow-[#c9a66b]/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#c9a66b]/15"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setViewingImage(img)}
                                        className="block w-full"
                                        aria-label="View full image"
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.caption ?? 'Inspo'}
                                            className="aspect-square w-full cursor-zoom-in object-cover"
                                        />
                                    </button>

                                    {img.caption && (
                                        <p className="truncate px-2 py-1.5 text-xs text-[#4a4a4a]">
                                            {img.caption}
                                        </p>
                                    )}

                                    {confirmingDeleteId === img.id ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-2 text-center">
                                            <p className="text-xs font-medium text-white">
                                                Delete this image?
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(img.id)
                                                    }
                                                    className="rounded-full bg-[#A13F3F] px-3 py-1 text-xs font-semibold text-white hover:bg-[#8A3434]"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmingDeleteId(
                                                            null,
                                                        )
                                                    }
                                                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1a1a1a] hover:bg-[#f4e9e5]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConfirmingDeleteId(img.id)
                                            }
                                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100 hover:bg-[#A13F3F]"
                                            aria-label="Delete image"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {viewingImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setViewingImage(null)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingImage(null)}
                        aria-label="Close"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div
                        className="flex max-h-full max-w-full flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={viewingImage.url}
                            alt={viewingImage.caption ?? 'Inspo'}
                            className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        />
                        {viewingImage.caption && (
                            <p className="mt-3 text-center text-sm text-white/80">
                                {viewingImage.caption}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
