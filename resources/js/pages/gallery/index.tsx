import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ImagePlus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import InputError from '@/components/input-error';

type GalleryImage = {
    id: number;
    caption: string | null;
    image_url: string;
};

type Props = {
    images?: GalleryImage[] | null;
};

const inputClass =
    'w-full rounded-xl border border-[#B5C8E5] bg-white px-3 py-2 text-sm text-[#1F2D40] placeholder:text-[#758299] focus-visible:border-[#769AD0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#769AD0]/30';

export default function GalleryIndex({ images: imagesProp }: Props) {
    const images = Array.isArray(imagesProp) ? imagesProp : [];

    const { auth } = usePage<{
        auth?: {
            user?: {
                name?: string;
                role?: 'client' | 'artist' | 'admin';
            };
        };
    }>().props;

    const { data, setData, post, processing, errors, reset } = useForm<{
        image: File | null;
        caption: string;
    }>({
        image: null,
        caption: '',
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        post('/admin/gallery', {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    }

    function deleteImage(image: GalleryImage) {
        if (!window.confirm('Delete this photo from Recent Work?')) {
            return;
        }

        router.delete(`/admin/gallery/${image.id}`, {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Manage Recent Work" />

            <div className="min-h-screen bg-[#F2F5F8]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'Trixie'}
                    userRole={auth?.user?.role}
                    active="gallery"
                />

                <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative overflow-hidden rounded-[2rem] border border-[#D3DFEF] bg-gradient-to-br from-[#FAFCFE] via-white to-[#E6EEF8] p-6 shadow-lg shadow-[#95B1DB]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#D3DFEF]/50 blur-2xl" />
                        <div className="relative">
                            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#5F83AB] uppercase">
                                Artist studio
                            </p>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1F2D40] sm:text-4xl">
                                Recent Work
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B6B82] sm:text-base">
                                Add and curate the makeup looks clients can
                                browse on your landing page. Gallery photos stay
                                separate from service photos.
                            </p>
                        </div>
                    </section>

                    <form
                        onSubmit={submit}
                        className="grid gap-4 rounded-3xl border border-[#D3DFEF] bg-white p-5 shadow-lg shadow-[#95B1DB]/10 sm:p-6"
                    >
                        <h2 className="font-serif text-xl font-bold text-[#1F2D40]">
                            Add a gallery photo
                        </h2>

                        <label className="grid cursor-pointer gap-1.5 text-xs font-semibold text-[#5B6B82]">
                            Photo (JPG, PNG, or WebP; up to 5 MB)
                            <input
                                id="gallery-image"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                required
                                onChange={(event) =>
                                    setData(
                                        'image',
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className="sr-only"
                            />
                            <span className="flex flex-wrap items-center gap-3 rounded-xl border border-[#B5C8E5] bg-[#FFFCFD] p-2.5">
                                <span className="flex h-10 items-center rounded-full bg-[#E6EEF8] px-4 text-sm font-semibold text-[#5F83AB]">
                                    Choose a photo
                                </span>
                                <span className="min-w-0 flex-1 truncate text-sm font-normal text-[#5B6B82]">
                                    {data.image?.name ?? 'No photo selected'}
                                </span>
                            </span>
                            <InputError message={errors.image} />
                        </label>

                        <label className="grid gap-1.5 text-xs font-semibold text-[#5B6B82]">
                            Caption (optional)
                            <input
                                type="text"
                                value={data.caption}
                                maxLength={160}
                                onChange={(event) =>
                                    setData('caption', event.target.value)
                                }
                                placeholder="Describe this look"
                                className={inputClass}
                            />
                            <InputError message={errors.caption} />
                        </label>

                        <button
                            type="submit"
                            disabled={processing || !data.image}
                            className="flex w-fit items-center gap-2 rounded-full bg-[#5F83AB] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#769AD0]/25 transition hover:bg-[#5F83AB] disabled:opacity-50"
                        >
                            <ImagePlus className="h-4 w-4" />
                            {processing ? 'Uploading…' : 'Add photo'}
                        </button>
                    </form>

                    <section className="grid gap-4">
                        <div>
                            <p className="text-xs font-semibold tracking-[0.16em] text-[#5F83AB] uppercase">
                                Portfolio
                            </p>
                            <h2 className="mt-1 font-serif text-2xl font-bold text-[#1F2D40]">
                                Your gallery ({images.length})
                            </h2>
                        </div>

                        {images.length === 0 ? (
                            <p className="rounded-3xl border border-dashed border-[#B5C8E5] bg-white/80 p-6 text-sm text-[#5B6B82] shadow-sm">
                                No photos yet. Add a photo above to show it in
                                Recent Work.
                            </p>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {images.map((image) => (
                                    <article
                                        key={image.id}
                                        className="group overflow-hidden rounded-3xl border border-[#D3DFEF] bg-white shadow-sm shadow-[#95B1DB]/10 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#95B1DB]/15"
                                    >
                                        <img
                                            src={image.image_url}
                                            alt={image.caption || 'Makeup work'}
                                            className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                                        />

                                        <div className="flex items-center justify-between gap-3 p-3">
                                            <p className="min-w-0 flex-1 truncate text-sm text-[#5B6B82]">
                                                {image.caption || 'Makeup look'}
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteImage(image)
                                                }
                                                className="flex shrink-0 items-center gap-1 rounded-full border border-[#D9A5A5] px-3 py-1.5 text-xs font-semibold text-[#A13F3F] hover:bg-[#FDEDED]"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        </>
    );
}
