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
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
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

            <div className="min-h-screen bg-[#F2F5F8]">
                <DashboardHeader userName={auth?.user?.name ?? 'there'} active="inspo" />

                <div className="mx-auto max-w-4xl px-6 py-10 md:px-12">
                    <div className="mb-6">
                        <p className="mb-1 text-xs uppercase tracking-widest text-[#5F83AB]">Makeup Inspiration</p>
                        <h1 className="font-serif text-3xl font-bold text-[#1F2D40]">Your Inspiration History</h1>
                        <p className="mt-1 text-sm text-[#5B6B82]">
                            This collection is saved to your profile and available every time you book a session.
                        </p>
                    </div>

                    {/* upload form */}
                    <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-[#D3DFEF] bg-white p-5">
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
                                        <img key={i} src={src} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                                    ))}
                                    {previews.length > 3 && (
                                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#E6EEF8] text-xs font-semibold text-[#5F83AB]">
                                            +{previews.length - 3}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <label
                                    htmlFor="inspo-upload"
                                    className="mb-3 flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[#95B1DB] text-[#5F83AB] transition hover:bg-[#E6EEF8]/50 sm:mb-0"
                                >
                                    <ImagePlus className="h-6 w-6" />
                                </label>
                            )}

                            <div className="flex-1">
                                <label htmlFor="inspo-upload" className="mb-1 block cursor-pointer text-sm font-medium text-[#1F2D40]">
                                    {data.images.length > 0
                                        ? `${data.images.length} image${data.images.length > 1 ? 's' : ''} selected`
                                        : '+ Upload Inspiration (choose one or more)'}
                                </label>
                                <input
                                    type="text"
                                    value={data.caption}
                                    onChange={(e) => setData('caption', e.target.value)}
                                    placeholder="Add a short caption (optional)"
                                    maxLength={100}
                                    className="w-full rounded-lg border border-[#95B1DB] bg-[#FAFCFE] px-3 py-1.5 text-sm text-[#1F2D40] placeholder:text-[#5B6B82]/60 focus-visible:border-[#769AD0] focus-visible:outline-none"
                                />
                                {errors.images && <p className="mt-1 text-xs text-[#A13F3F]">{errors.images}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={data.images.length === 0 || processing}
                                className="mt-3 w-full rounded-full bg-[#5F83AB] text-white shadow-md shadow-[#95B1DB]/50 transition hover:bg-[#4E7099] disabled:opacity-50 sm:mt-0 sm:w-auto"
                            >
                                <Upload className="h-4 w-4" /> {processing ? 'Uploading...' : 'Upload'}
                            </Button>
                        </div>

                        {justUploaded && (
                            <p className="mt-3 text-sm font-medium text-[#2E7D46]">Added to your inspiration history!</p>
                        )}
                    </form>

                    {/* history */}
                    {images.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#D3DFEF] bg-white px-6 py-16 text-center">
                            <Sparkles className="h-8 w-8 text-[#95B1DB]" />
                            <p className="font-semibold text-[#1F2D40]">No inspiration images yet</p>
                            <p className="max-w-xs text-sm text-[#5B6B82]">
                                Upload a photo of a look you'd like to recreate — it'll be here every time you book.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                            {images.map((img) => (
                                <div key={img.id} className="group relative overflow-hidden rounded-xl border border-[#D3DFEF] bg-white">
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

                                    {img.caption && <p className="truncate px-2 py-1.5 text-xs text-[#5B6B82]">{img.caption}</p>}

                                    {confirmingDeleteId === img.id ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 p-2 text-center">
                                            <p className="text-xs font-medium text-white">Delete this image?</p>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(img.id)}
                                                    className="rounded-full bg-[#A13F3F] px-3 py-1 text-xs font-semibold text-white hover:bg-[#8A3434]"
                                                >
                                                    Delete
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingDeleteId(null)}
                                                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1F2D40] hover:bg-[#E6EEF8]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmingDeleteId(img.id)}
                                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition hover:bg-[#A13F3F] group-hover:opacity-100"
                                            aria-label="Delete image"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="flex max-h-full max-w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={viewingImage.url}
                            alt={viewingImage.caption ?? 'Inspo'}
                            className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        />
                        {viewingImage.caption && <p className="mt-3 text-center text-sm text-white/80">{viewingImage.caption}</p>}
                    </div>
                </div>
            )}
        </>
    );
}
