import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Brush, CalendarDays, Clock, ImagePlus, PartyPopper, Sparkles, User as UserIcon, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import DashboardHeader from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Artist = {
    id: number;
    name: string;
    specialty: string | null;
    years_experience: number | null;
    bio: string | null;
};

type InspoImage = {
    id: number;
    url: string;
    caption: string | null;
};

type Props = {
    artist: Artist | null;
    inspoImages: InspoImage[];
};

const SERVICES = ['Everyday Glam', 'Bridal Makeup', 'Photoshoot Glam', 'Special Events'];
const OCCASIONS = ['Wedding', 'Prom / Formal', 'Graduation', 'Job Interview', 'Birthday', 'Date Night', 'Photoshoot'];

const fieldClass =
    'w-full rounded-xl border border-[#F3A6C0] bg-[#FFFAFB] px-3 py-2 text-sm text-[#4A2C33] focus-visible:border-[#E75480] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E75480]/40';

// Uses local time (not UTC) so the minimum date is correct in the Philippines.
function todayISO() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

export default function CreateBooking({ artist, inspoImages }: Props) {
    const { auth } = usePage<{ auth?: { user?: { name?: string; role?: 'client' | 'artist' | 'admin' } } }>().props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newPreview, setNewPreview] = useState<string | null>(null);
    const [viewingUrl, setViewingUrl] = useState<string | null>(null);

    // The occasion is kept separate from the Notes box; the two are only
    // combined when the form is submitted.
    const [occasion, setOccasion] = useState('');
    const [otherMode, setOtherMode] = useState(false);
    const [otherText, setOtherText] = useState('');

    const { data, setData, post, processing, errors, transform } = useForm<{
        service: string;
        booking_date: string;
        booking_time: string;
        notes: string;
        inspo_image_id: number | null;
        new_inspo_image: File | null;
    }>({
        service: '',
        booking_date: '',
        booking_time: '',
        notes: '',
        inspo_image_id: null,
        new_inspo_image: null,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Saved in the existing notes column as "Occasion: X" on the first line.
        transform((d) => ({
            ...d,
            notes: occasion ? `Occasion: ${occasion}\n${d.notes}` : d.notes,
        }));

        post('/book', { forceFormData: true });
    }

    function handleNewInspoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData((prev) => ({ ...prev, new_inspo_image: file, inspo_image_id: file ? null : prev.inspo_image_id }));
        setNewPreview(file ? URL.createObjectURL(file) : null);
    }

    function selectExisting(id: number) {
        setData((prev) => ({ ...prev, inspo_image_id: id, new_inspo_image: null }));
        setNewPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleChipClick(label: string) {
        setOtherMode(false);
        setOtherText('');
        // tapping the same chip again removes it
        setOccasion((prev) => (prev === label ? '' : label));
    }

    function handleOtherClick() {
        setOtherMode(true);
        setOccasion(otherText.trim());
    }

    function handleOtherChange(value: string) {
        setOtherText(value);
        setOccasion(value.trim());
    }

    useEffect(() => {
        if (!viewingUrl) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setViewingUrl(null);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewingUrl]);

    return (
        <>
            <Head title="Book a Session" />

            <div className="min-h-screen bg-[#FFF5F7]">
                <DashboardHeader userName={auth?.user?.name ?? 'there'} userRole={auth?.user?.role} active="book" />

                <div className="mx-auto max-w-2xl px-6 py-10 md:px-12">
                    <div className="mb-6">
                        <p className="mb-1 text-xs uppercase tracking-widest text-[#E75480]">Book a Session</p>
                        <h1 className="font-serif text-3xl font-bold text-[#4A2C33]">Let's get you glammed</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="grid gap-6 rounded-2xl border border-[#F7C6D9] bg-white p-6">
                        {/* your artist */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-[#4A2C33]">
                                <UserIcon className="h-4 w-4 text-[#E75480]" /> Your artist
                            </Label>
                            {artist ? (
                                <div className="rounded-xl border border-[#E75480] bg-[#FCE4EC] p-3">
                                    <p className="text-sm font-semibold text-[#4A2C33]">{artist.name}</p>
                                    <p className="text-xs text-[#7A5560]">
                                        {artist.specialty ?? 'Makeup Artist'}
                                        {artist.years_experience != null && ` · ${artist.years_experience} yrs exp.`}
                                    </p>
                                    {artist.bio && <p className="mt-1.5 text-xs text-[#7A5560]">{artist.bio}</p>}
                                </div>
                            ) : (
                                <p className="text-sm text-[#7A5560]">Bookings aren't open yet. Check back soon!</p>
                            )}
                        </div>

                        {/* service picker */}
                        <div className="grid gap-2">
                            <Label htmlFor="service" className="flex items-center gap-1.5 text-[#4A2C33]">
                                <Brush className="h-4 w-4 text-[#E75480]" /> Service
                            </Label>
                            <select
                                id="service"
                                value={data.service}
                                onChange={(e) => setData('service', e.target.value)}
                                required
                                className={fieldClass}
                            >
                                <option value="" disabled>
                                    Select a service
                                </option>
                                {SERVICES.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.service} />
                        </div>

                        {/* date + time */}
                        <div className="grid items-start gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="booking_date" className="flex items-center gap-1.5 text-[#4A2C33]">
                                    <CalendarDays className="h-4 w-4 text-[#E75480]" /> Date
                                </Label>
                                <input
                                    id="booking_date"
                                    type="date"
                                    value={data.booking_date}
                                    onChange={(e) => setData('booking_date', e.target.value)}
                                    required
                                    min={todayISO()}
                                    className={fieldClass}
                                />
                                <InputError message={errors.booking_date} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="booking_time" className="flex items-center gap-1.5 text-[#4A2C33]">
                                    <Clock className="h-4 w-4 text-[#E75480]" /> Time
                                </Label>
                                <input
                                    id="booking_time"
                                    type="time"
                                    value={data.booking_time}
                                    onChange={(e) => setData('booking_time', e.target.value)}
                                    required
                                    className={fieldClass}
                                />
                                <InputError message={errors.booking_time} />
                            </div>
                        </div>

                        {/* Makeup Inspiration section */}
                        <div className="grid gap-2 rounded-xl border border-[#F3A6C0]/60 bg-[#FFEAF2] p-4">
                            <Label className="flex items-center gap-1.5 text-[#4A2C33]">
                                <ImagePlus className="h-4 w-4 text-[#E75480]" /> Makeup Inspiration{' '}
                                <span className="font-normal text-[#7A5560]">(optional)</span>
                            </Label>
                            <p className="text-xs text-[#7A5560]">
                                Pick from your Inspiration History or upload a new photo — it's saved to your profile and your artist will see it.
                            </p>

                            {inspoImages.length > 0 && (
                                <>
                                    <p className="mt-1 text-xs font-semibold text-[#4A2C33]">Your Inspiration History</p>
                                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                                        {inspoImages.map((img) => (
                                            <div key={img.id} className="group relative">
                                                <button
                                                    type="button"
                                                    onClick={() => selectExisting(img.id)}
                                                    className={`block aspect-square w-full overflow-hidden rounded-lg border-2 transition ${
                                                        data.inspo_image_id === img.id
                                                            ? 'border-[#E75480] ring-2 ring-[#E75480]/40'
                                                            : 'border-transparent hover:border-[#F3A6C0]'
                                                    }`}
                                                >
                                                    <img
                                                        src={img.url}
                                                        alt={img.caption ?? 'Inspo'}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingUrl(img.url)}
                                                    className="absolute bottom-1 right-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition hover:bg-black/70 group-hover:opacity-100"
                                                    aria-label="View full image"
                                                >
                                                    <ImagePlus className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleNewInspoChange}
                                    className="hidden"
                                    id="new-inspo-upload"
                                />
                                {newPreview ? (
                                    <button
                                        type="button"
                                        onClick={() => setViewingUrl(newPreview)}
                                        className="h-16 w-16 overflow-hidden rounded-lg border-2 border-[#E75480]"
                                    >
                                        <img src={newPreview} alt="New upload preview" className="h-full w-full object-cover" />
                                    </button>
                                ) : null}
                                <label
                                    htmlFor="new-inspo-upload"
                                    className="cursor-pointer rounded-full border border-[#F3A6C0] bg-white px-4 py-1.5 text-xs font-semibold text-[#E75480] transition hover:bg-[#FCE4EC]"
                                >
                                    {data.new_inspo_image ? 'Change new photo' : '+ Upload Inspiration'}
                                </label>
                                <Link href="/inspo" className="text-xs font-semibold text-[#7A5560] underline-offset-2 hover:underline">
                                    View full history
                                </Link>
                            </div>
                            <InputError message={errors.new_inspo_image} />
                            <InputError message={errors.inspo_image_id} />
                        </div>

                        {/* occasion (chips) */}
                        <div className="grid gap-2">
                            <Label className="flex items-center gap-1.5 text-[#4A2C33]">
                                <PartyPopper className="h-4 w-4 text-[#E75480]" /> What's the occasion?{' '}
                                <span className="font-normal text-[#7A5560]">(optional)</span>
                            </Label>
                            <p className="text-xs text-[#7A5560]">
                                Not sure what to ask for? Tell us the event and your artist will know what look fits.
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {OCCASIONS.map((label) => (
                                    <button
                                        key={label}
                                        type="button"
                                        onClick={() => handleChipClick(label)}
                                        aria-pressed={occasion === label && !otherMode}
                                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                            occasion === label && !otherMode
                                                ? 'border-[#E75480] bg-[#FCE4EC] text-[#E75480]'
                                                : 'border-[#F3A6C0]/60 bg-[#FFFAFB] text-[#7A5560] hover:bg-[#FCE4EC]/50'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleOtherClick}
                                    aria-pressed={otherMode}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                        otherMode
                                            ? 'border-[#E75480] bg-[#FCE4EC] text-[#E75480]'
                                            : 'border-[#F3A6C0]/60 bg-[#FFFAFB] text-[#7A5560] hover:bg-[#FCE4EC]/50'
                                    }`}
                                >
                                    Other
                                </button>
                            </div>

                            {otherMode && (
                                <input
                                    type="text"
                                    value={otherText}
                                    onChange={(e) => handleOtherChange(e.target.value)}
                                    placeholder="Tell us the occasion..."
                                    maxLength={60}
                                    className={fieldClass}
                                />
                            )}
                        </div>

                        {/* notes (free text only — the occasion is not written into this box) */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes" className="text-[#4A2C33]">
                                Notes <span className="font-normal text-[#7A5560]">(optional)</span>
                            </Label>
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                maxLength={420}
                                placeholder="Allergies, preferred style, anything else we should know..."
                                className={`${fieldClass} resize-none`}
                            />
                            <InputError message={errors.notes} />
                        </div>

                        <Button
                            type="submit"
                            disabled={!artist || processing}
                            className="w-full rounded-full bg-[#E75480] text-white shadow-md shadow-[#F3A6C0]/50 transition duration-200 hover:bg-[#D63F6E] hover:shadow-lg disabled:opacity-50"
                        >
                            {processing && <Spinner />}
                            <Sparkles className="h-4 w-4" /> Confirm Booking
                        </Button>
                    </form>
                </div>
            </div>

            {viewingUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setViewingUrl(null)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingUrl(null)}
                        aria-label="Close"
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <img
                        src={viewingUrl}
                        alt="Full view"
                        className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
