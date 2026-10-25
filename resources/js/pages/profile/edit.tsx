import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Briefcase,
    Camera,
    Mail,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    Trash2,
    User as UserIcon,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';
import InputError from '@/components/input-error';
import RequiredAsterisk from '@/components/required-asterisk';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    user: {
        name: string;
        email: string;
        phone: string | null;
        role: 'client' | 'artist' | 'admin';
        avatar_url: string | null;
        street_address: string | null;
        barangay: string | null;
        city: string | null;
        province: string | null;
        postal_code: string | null;
        specialty: string | null;
        years_experience: number | null;
        bio: string | null;
        metro_manila_travel_fee: number | null;
        out_of_town_travel_fee: number | null;
    };
};

const fieldClass =
    'w-full rounded-xl border border-[#d7c0a2] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#6b625a] focus-visible:border-[#8a6a2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6a2f]/30';

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

export default function EditProfile({ user }: Props) {
    const { auth } = usePage<{
        auth?: {
            user?: { name?: string; role?: 'client' | 'artist' | 'admin' };
        };
    }>().props;

    const isArtist = user.role === 'artist';
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cropDragRef = useRef<{
        pointerX: number;
        pointerY: number;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [viewingAvatar, setViewingAvatar] = useState(false);
    const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
    const [cropImageSize, setCropImageSize] = useState<{
        width: number;
        height: number;
    } | null>(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
    const [cropError, setCropError] = useState<string | null>(null);

    const { data, setData, patch, processing, errors, isDirty } = useForm({
        name: user.name,
        phone: user.phone ?? '',
        avatar: null as File | null,
        remove_avatar: false,
        street_address: user.street_address ?? '',
        barangay: user.barangay ?? '',
        city: user.city ?? '',
        province: user.province ?? '',
        postal_code: user.postal_code ?? '',
        specialty: user.specialty ?? '',
        years_experience:
            user.years_experience != null ? String(user.years_experience) : '',
        bio: user.bio ?? '',
        metro_manila_travel_fee: String(user.metro_manila_travel_fee ?? 500),
        out_of_town_travel_fee: String(user.out_of_town_travel_fee ?? 1000),
    });

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        if (cropImageUrl) {
            URL.revokeObjectURL(cropImageUrl);
        }

        setCropImageUrl(URL.createObjectURL(file));
        setCropImageSize(null);
        setCropZoom(1);
        setCropOffset({ x: 0, y: 0 });
        setCropError(null);
    }

    function closeCropEditor() {
        if (cropImageUrl) {
            URL.revokeObjectURL(cropImageUrl);
        }

        setCropImageUrl(null);
        setCropImageSize(null);
        setCropError(null);
        cropDragRef.current = null;

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function cropDimensions(zoom = cropZoom) {
        if (!cropImageSize) {
            return null;
        }

        const scale =
            Math.max(288 / cropImageSize.width, 288 / cropImageSize.height) *
            zoom;

        return {
            scale,
            width: cropImageSize.width * scale,
            height: cropImageSize.height * scale,
        };
    }

    function handleCropPointerMove(event: React.PointerEvent<HTMLDivElement>) {
        const drag = cropDragRef.current;
        const dimensions = cropDimensions();

        if (!drag || !dimensions) {
            return;
        }

        const maxX = Math.max(0, (dimensions.width - 288) / 2);
        const maxY = Math.max(0, (dimensions.height - 288) / 2);
        setCropOffset({
            x: Math.max(
                -maxX,
                Math.min(maxX, drag.offsetX + event.clientX - drag.pointerX),
            ),
            y: Math.max(
                -maxY,
                Math.min(maxY, drag.offsetY + event.clientY - drag.pointerY),
            ),
        });
    }

    async function applyAvatarCrop() {
        if (!cropImageUrl || !cropImageSize) {
            return;
        }

        try {
            const image = new Image();
            image.src = cropImageUrl;
            await image.decode();

            const dimensions = cropDimensions();

            if (!dimensions) {
                return;
            }

            const left = (288 - dimensions.width) / 2 + cropOffset.x;
            const top = (288 - dimensions.height) / 2 + cropOffset.y;
            const sourceX = Math.max(
                0,
                Math.min(
                    cropImageSize.width - 288 / dimensions.scale,
                    -left / dimensions.scale,
                ),
            );
            const sourceY = Math.max(
                0,
                Math.min(
                    cropImageSize.height - 288 / dimensions.scale,
                    -top / dimensions.scale,
                ),
            );
            const sourceSize = 288 / dimensions.scale;
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const context = canvas.getContext('2d');

            if (!context) {
                throw new Error('Canvas is unavailable');
            }

            context.drawImage(
                image,
                sourceX,
                sourceY,
                sourceSize,
                sourceSize,
                0,
                0,
                512,
                512,
            );

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (result) =>
                        result
                            ? resolve(result)
                            : reject(new Error('Could not crop the image')),
                    'image/jpeg',
                    0.9,
                );
            });
            const croppedFile = new File([blob], 'profile-photo.jpg', {
                type: 'image/jpeg',
            });
            setData('avatar', croppedFile);
            setData('remove_avatar', false);

            if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
            }

            setAvatarPreview(URL.createObjectURL(croppedFile));
            closeCropEditor();
        } catch {
            setCropError(
                'Could not adjust this image. Please choose another photo and try again.',
            );
        }
    }

    function handleRemoveAvatar() {
        if (avatarPreview) {
            URL.revokeObjectURL(avatarPreview);
        }

        setData('avatar', null);
        setData('remove_avatar', true);
        setAvatarPreview(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch('/profile', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setData('remove_avatar', false);

                if (avatarPreview) {
                    URL.revokeObjectURL(avatarPreview);
                }

                setAvatarPreview(null);
            },
        });
    }

    const displayedAvatar =
        avatarPreview ?? (!data.remove_avatar ? user.avatar_url : null);

    useEffect(() => {
        if (!viewingAvatar && !cropImageUrl) {
            return;
        }

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setViewingAvatar(false);

                if (cropImageUrl) {
                    URL.revokeObjectURL(cropImageUrl);
                }

                setCropImageUrl(null);
                setCropImageSize(null);
                cropDragRef.current = null;
            }
        }
        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewingAvatar, cropImageUrl]);

    return (
        <>
            <Head title="Profile" />

            <div className="min-h-screen bg-[#faf7f4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="profile"
                />

                <main className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#e8d7cf] bg-gradient-to-br from-[#fffcf8] via-white to-[#f4e9e5] p-6 shadow-lg shadow-[#c9a66b]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#e8d7cf]/50 blur-2xl" />
                        <div className="relative">
                            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#8a6a2f] uppercase">
                                Profile
                            </p>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1a1a] sm:text-4xl">
                                Your details
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4a4a4a] sm:text-base">
                                {isArtist
                                    ? 'These details are shown to clients on the booking page.'
                                    : 'Your artist uses these to reach you about your bookings.'}
                            </p>
                        </div>
                    </section>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-6 rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-lg shadow-[#c9a66b]/10 sm:p-7"
                    >
                        {/* avatar */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {displayedAvatar ? (
                                    <button
                                        type="button"
                                        onClick={() => setViewingAvatar(true)}
                                        aria-label="View full-size profile picture"
                                        className="block h-20 w-20 cursor-zoom-in rounded-full"
                                    >
                                        <img
                                            src={displayedAvatar}
                                            alt={user.name}
                                            className="h-20 w-20 rounded-full object-cover ring-2 ring-[#e8d7cf]"
                                        />
                                    </button>
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f4e9e5] text-xl font-semibold text-[#8a6a2f] ring-2 ring-[#e8d7cf]">
                                        {initials(user.name)}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    aria-label="Change profile picture"
                                    className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#8a6a2f] text-white shadow-md transition hover:bg-[#735829]"
                                >
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </div>

                            <div>
                                <p className="text-sm font-medium text-[#1a1a1a]">
                                    Profile picture
                                </p>
                                <p className="mb-1.5 text-xs text-[#4a4a4a]">
                                    JPG, PNG or WEBP. Max 2MB.
                                </p>
                                {displayedAvatar && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        className="flex items-center gap-1 text-xs font-semibold text-[#A13F3F] transition hover:text-[#8A3434]"
                                    >
                                        <Trash2 className="h-3 w-3" /> Remove
                                        photo
                                    </button>
                                )}
                            </div>
                        </div>
                        <InputError message={errors.avatar} />

                        <div className="grid gap-2">
                            <Label
                                htmlFor="name"
                                className="flex items-center gap-1.5 text-[#1a1a1a]"
                            >
                                <UserIcon className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                Full name<RequiredAsterisk />
                            </Label>
                            <input
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                autoComplete="name"
                                maxLength={255}
                                required
                                className={fieldClass}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="email"
                                className="flex items-center gap-1.5 text-[#1a1a1a]"
                            >
                                <Mail className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                Email
                            </Label>
                            <input
                                id="email"
                                type="email"
                                value={user.email}
                                readOnly
                                disabled
                                className={`${fieldClass} cursor-not-allowed opacity-70`}
                            />
                            <p className="text-xs text-[#4a4a4a]">
                                Your email is your login, so it can't be changed
                                here.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="phone"
                                className="flex items-center gap-1.5 text-[#1a1a1a]"
                            >
                                <Phone className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                Mobile number<RequiredAsterisk />
                            </Label>
                            <input
                                id="phone"
                                type="tel"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                autoComplete="tel"
                                maxLength={20}
                                placeholder="e.g. 0917 123 4567"
                                required
                                className={fieldClass}
                            />
                            <InputError message={errors.phone} />
                        </div>

                        {isArtist && (
                            /* artist details */
                            <div className="grid gap-4 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
                                    <Briefcase className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                    Artist details{' '}
                                    <span className="font-normal text-[#4a4a4a]">
                                        (optional)
                                    </span>
                                </p>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="specialty"
                                        className="text-[#1a1a1a]"
                                    >
                                        Specialty
                                    </Label>
                                    <input
                                        id="specialty"
                                        type="text"
                                        value={data.specialty}
                                        onChange={(e) =>
                                            setData('specialty', e.target.value)
                                        }
                                        maxLength={100}
                                        placeholder="e.g. Bridal & Everyday Glam"
                                        className={fieldClass}
                                    />
                                    <InputError message={errors.specialty} />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="years_experience"
                                        className="text-[#1a1a1a]"
                                    >
                                        Years of experience
                                    </Label>
                                    <input
                                        id="years_experience"
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        max={60}
                                        step={1}
                                        value={data.years_experience}
                                        onChange={(e) =>
                                            setData(
                                                'years_experience',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. 5"
                                        className={fieldClass}
                                    />
                                    <InputError
                                        message={errors.years_experience}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="bio"
                                        className="text-[#1a1a1a]"
                                    >
                                        Short bio
                                    </Label>
                                    <textarea
                                        id="bio"
                                        value={data.bio}
                                        onChange={(e) =>
                                            setData('bio', e.target.value)
                                        }
                                        rows={3}
                                        maxLength={300}
                                        placeholder="Tell clients about your style and experience..."
                                        className={`${fieldClass} resize-none`}
                                    />
                                    <InputError message={errors.bio} />
                                </div>

                                <div className="border-t border-[#e8d7cf] pt-4">
                                    <p className="text-sm font-semibold text-[#1a1a1a]">
                                        Transportation starting fees
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[#4a4a4a]">
                                        Clients see the matching starting fee
                                        after choosing their service location.
                                        You can confirm the final travel price
                                        from the full address.
                                    </p>
                                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="metro_manila_travel_fee"
                                                className="text-[#1a1a1a]"
                                            >
                                                Metro Manila (₱)<RequiredAsterisk />
                                            </Label>
                                            <input
                                                id="metro_manila_travel_fee"
                                                type="number"
                                                min={0}
                                                max={1000000}
                                                step={1}
                                                inputMode="numeric"
                                                value={
                                                    data.metro_manila_travel_fee
                                                }
                                                onChange={(e) =>
                                                    setData(
                                                        'metro_manila_travel_fee',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                                className={fieldClass}
                                            />
                                            <InputError
                                                message={
                                                    errors.metro_manila_travel_fee
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="out_of_town_travel_fee"
                                                className="text-[#1a1a1a]"
                                            >
                                                Nearby provinces (₱)<RequiredAsterisk />
                                            </Label>
                                            <input
                                                id="out_of_town_travel_fee"
                                                type="number"
                                                min={0}
                                                max={1000000}
                                                step={1}
                                                inputMode="numeric"
                                                value={
                                                    data.out_of_town_travel_fee
                                                }
                                                onChange={(e) =>
                                                    setData(
                                                        'out_of_town_travel_fee',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                                className={fieldClass}
                                            />
                                            <InputError
                                                message={
                                                    errors.out_of_town_travel_fee
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {
                            /* address: required for clients, optional for the artist */
                            <div className="grid gap-4 rounded-2xl border border-[#e8d7cf] bg-[#fffcf8] p-4">
                                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
                                    <MapPin className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                    {isArtist
                                        ? 'Studio address (optional)'
                                        : 'Address'}
                                </p>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="street_address"
                                        className="text-[#1a1a1a]"
                                    >
                                        House no. / Street{!isArtist && <RequiredAsterisk />}
                                    </Label>
                                    <input
                                        id="street_address"
                                        type="text"
                                        value={data.street_address}
                                        onChange={(e) =>
                                            setData(
                                                'street_address',
                                                e.target.value,
                                            )
                                        }
                                        autoComplete="address-line1"
                                        maxLength={255}
                                        placeholder="e.g. 123 Rizal St."
                                        required={!isArtist}
                                        className={fieldClass}
                                    />
                                    <InputError
                                        message={errors.street_address}
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="barangay"
                                            className="text-[#1a1a1a]"
                                        >
                                            Barangay{!isArtist && <RequiredAsterisk />}
                                        </Label>
                                        <input
                                            id="barangay"
                                            type="text"
                                            value={data.barangay}
                                            onChange={(e) =>
                                                setData(
                                                    'barangay',
                                                    e.target.value,
                                                )
                                            }
                                            autoComplete="address-level3"
                                            maxLength={100}
                                            required={!isArtist}
                                            className={fieldClass}
                                        />
                                        <InputError message={errors.barangay} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="city"
                                            className="text-[#1a1a1a]"
                                        >
                                            City / Municipality{!isArtist && <RequiredAsterisk />}
                                        </Label>
                                        <input
                                            id="city"
                                            type="text"
                                            value={data.city}
                                            onChange={(e) =>
                                                setData('city', e.target.value)
                                            }
                                            autoComplete="address-level2"
                                            maxLength={100}
                                            required={!isArtist}
                                            className={fieldClass}
                                        />
                                        <InputError message={errors.city} />
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="province"
                                            className="text-[#1a1a1a]"
                                        >
                                            Province{!isArtist && <RequiredAsterisk />}
                                        </Label>
                                        <input
                                            id="province"
                                            type="text"
                                            value={data.province}
                                            onChange={(e) =>
                                                setData(
                                                    'province',
                                                    e.target.value,
                                                )
                                            }
                                            autoComplete="address-level1"
                                            maxLength={100}
                                            required={!isArtist}
                                            className={fieldClass}
                                        />
                                        <InputError message={errors.province} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="postal_code"
                                            className="text-[#1a1a1a]"
                                        >
                                            Postal code{!isArtist && <RequiredAsterisk />}
                                        </Label>
                                        <input
                                            id="postal_code"
                                            type="text"
                                            inputMode="numeric"
                                            value={data.postal_code}
                                            onChange={(e) =>
                                                setData(
                                                    'postal_code',
                                                    e.target.value.replace(
                                                        /\D/g,
                                                        '',
                                                    ),
                                                )
                                            }
                                            autoComplete="postal-code"
                                            maxLength={4}
                                            placeholder="e.g. 8000"
                                            required={!isArtist}
                                            className={fieldClass}
                                        />
                                        <InputError
                                            message={errors.postal_code}
                                        />
                                    </div>
                                </div>
                            </div>
                        }

                        <Button
                            type="submit"
                            disabled={processing || !isDirty}
                            className="w-full rounded-full bg-[#8a6a2f] text-white shadow-md shadow-[#8a6a2f]/25 transition duration-200 hover:bg-[#8a6a2f] hover:shadow-lg disabled:opacity-50"
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}{' '}
                            Save changes
                        </Button>
                    </form>

                    <div className="mt-6 flex items-center justify-between gap-4 rounded-3xl border border-[#e8d7cf] bg-white p-5 shadow-sm shadow-[#c9a66b]/10">
                        <div>
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a]">
                                <ShieldCheck className="h-4 w-4 text-[#8a6a2f]" />{' '}
                                Password &amp; security
                            </p>
                            <p className="text-xs text-[#4a4a4a]">
                                Change your password or manage two-factor
                                sign-in.
                            </p>
                        </div>
                        <Link
                            href="/settings/security"
                            className="shrink-0 rounded-full border border-[#c9a66b] px-4 py-1.5 text-sm font-semibold text-[#8a6a2f] transition-colors duration-200 hover:bg-[#f4e9e5]"
                        >
                            Manage
                        </Link>
                    </div>
                </main>
            </div>

            {cropImageUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={closeCropEditor}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="avatar-crop-title"
                        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2
                                    id="avatar-crop-title"
                                    className="text-lg font-semibold text-[#1a1a1a]"
                                >
                                    Adjust profile picture
                                </h2>
                                <p className="mt-1 text-xs text-[#4a4a4a]">
                                    Drag to move the photo. Use the slider to
                                    zoom.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCropEditor}
                                aria-label="Cancel photo adjustment"
                                className="rounded-full p-2 text-[#4a4a4a] hover:bg-[#f4e9e5]"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div
                            className="relative mx-auto mt-5 h-72 w-72 touch-none overflow-hidden rounded-full bg-[#f4e9e5] ring-4 ring-[#e8d7cf]"
                            onPointerDown={(event) => {
                                event.currentTarget.setPointerCapture(
                                    event.pointerId,
                                );
                                cropDragRef.current = {
                                    pointerX: event.clientX,
                                    pointerY: event.clientY,
                                    offsetX: cropOffset.x,
                                    offsetY: cropOffset.y,
                                };
                            }}
                            onPointerMove={handleCropPointerMove}
                            onPointerUp={() => {
                                cropDragRef.current = null;
                            }}
                            onPointerCancel={() => {
                                cropDragRef.current = null;
                            }}
                            aria-label="Drag the photo to adjust its position"
                        >
                            <img
                                src={cropImageUrl}
                                alt="Photo crop preview"
                                draggable={false}
                                onLoad={(event) =>
                                    setCropImageSize({
                                        width: event.currentTarget.naturalWidth,
                                        height: event.currentTarget
                                            .naturalHeight,
                                    })
                                }
                                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
                                style={
                                    cropDimensions()
                                        ? {
                                              width: cropDimensions()!.width,
                                              height: cropDimensions()!.height,
                                              transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
                                          }
                                        : { visibility: 'hidden' }
                                }
                            />
                        </div>

                        <div className="mt-5 grid gap-2">
                            <label
                                htmlFor="avatar-zoom"
                                className="text-sm font-medium text-[#1a1a1a]"
                            >
                                Zoom
                            </label>
                            <input
                                id="avatar-zoom"
                                type="range"
                                min="1"
                                max="3"
                                step="0.01"
                                value={cropZoom}
                                onChange={(event) => {
                                    const zoom = Number(event.target.value);
                                    const dimensions = cropDimensions(zoom);
                                    setCropZoom(zoom);

                                    if (dimensions) {
                                        const maxX = Math.max(
                                            0,
                                            (dimensions.width - 288) / 2,
                                        );
                                        const maxY = Math.max(
                                            0,
                                            (dimensions.height - 288) / 2,
                                        );
                                        setCropOffset((offset) => ({
                                            x: Math.max(
                                                -maxX,
                                                Math.min(maxX, offset.x),
                                            ),
                                            y: Math.max(
                                                -maxY,
                                                Math.min(maxY, offset.y),
                                            ),
                                        }));
                                    }
                                }}
                                className="w-full accent-[#8a6a2f]"
                            />
                        </div>
                        {cropError && (
                            <p
                                role="alert"
                                className="mt-3 text-sm text-[#A13F3F]"
                            >
                                {cropError}
                            </p>
                        )}

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeCropEditor}
                                className="rounded-full border border-[#c9a66b] px-4 py-2 text-sm font-semibold text-[#8a6a2f] hover:bg-[#f4e9e5]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void applyAvatarCrop()}
                                disabled={!cropImageSize}
                                className="rounded-full bg-[#8a6a2f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#735829] disabled:opacity-50"
                            >
                                Use photo
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {viewingAvatar && displayedAvatar && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() => setViewingAvatar(false)}
                >
                    <button
                        type="button"
                        onClick={() => setViewingAvatar(false)}
                        aria-label="Close"
                        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <img
                        src={displayedAvatar}
                        alt={user.name}
                        className="max-h-[85vh] max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
