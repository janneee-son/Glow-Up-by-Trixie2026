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
    };
};

const fieldClass =
    'w-full rounded-xl border border-[#DCCAD4] bg-white px-3 py-2 text-sm text-[#312532] placeholder:text-[#9B8A95] focus-visible:border-[#B47B94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B47B94]/30';

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
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [viewingAvatar, setViewingAvatar] = useState(false);

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
    });

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('avatar', file);
        setData('remove_avatar', false);
        setAvatarPreview(file ? URL.createObjectURL(file) : null);
    }

    function handleRemoveAvatar() {
        setData('avatar', null);
        setData('remove_avatar', true);
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch('/profile', {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setData('remove_avatar', false);
                setAvatarPreview(null);
            },
        });
    }

    const displayedAvatar =
        avatarPreview ?? (!data.remove_avatar ? user.avatar_url : null);

    useEffect(() => {
        if (!viewingAvatar) return;
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setViewingAvatar(false);
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewingAvatar]);

    return (
        <>
            <Head title="Profile" />

            <div className="min-h-screen bg-[#F8F5F4]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="profile"
                />

                <main className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 md:py-10">
                    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-[#EADDE3] bg-gradient-to-br from-[#FFF9F6] via-white to-[#F2EDF7] p-6 shadow-lg shadow-[#BDA6B5]/10 md:p-8">
                        <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-[#EADDE3]/50 blur-2xl" />
                        <div className="relative">
                            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#9B7085] uppercase">
                                Profile
                            </p>
                            <h1 className="font-serif text-3xl font-bold tracking-tight text-[#312532] sm:text-4xl">
                                Your details
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#766976] sm:text-base">
                                {isArtist
                                    ? 'These details are shown to clients on the booking page.'
                                    : 'Your artist uses these to reach you about your bookings.'}
                            </p>
                        </div>
                    </section>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-6 rounded-3xl border border-[#EADDE3] bg-white p-5 shadow-lg shadow-[#BDA6B5]/10 sm:p-7"
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
                                            className="h-20 w-20 rounded-full object-cover ring-2 ring-[#D3DFEF]"
                                        />
                                    </button>
                                ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#EDF3FA] text-xl font-semibold text-[#5F83AB] ring-2 ring-[#D3DFEF]">
                                        {initials(user.name)}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    aria-label="Change profile picture"
                                    className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#5F83AB] text-white shadow-md transition hover:bg-[#4E7099]"
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
                                <p className="text-sm font-medium text-[#1F2D40]">
                                    Profile picture
                                </p>
                                <p className="mb-1.5 text-xs text-[#5B6B82]">
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
                                className="flex items-center gap-1.5 text-[#1F2D40]"
                            >
                                <UserIcon className="h-4 w-4 text-[#5F83AB]" />{' '}
                                Full name
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
                                className="flex items-center gap-1.5 text-[#1F2D40]"
                            >
                                <Mail className="h-4 w-4 text-[#5F83AB]" />{' '}
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
                            <p className="text-xs text-[#5B6B82]">
                                Your email is your login, so it can't be changed
                                here.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="phone"
                                className="flex items-center gap-1.5 text-[#1F2D40]"
                            >
                                <Phone className="h-4 w-4 text-[#5F83AB]" />{' '}
                                Mobile number
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
                            <div className="grid gap-4 rounded-2xl border border-[#EADDE3] bg-[#FCF8F8] p-4">
                                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1F2D40]">
                                    <Briefcase className="h-4 w-4 text-[#5F83AB]" />{' '}
                                    Artist details{' '}
                                    <span className="font-normal text-[#5B6B82]">
                                        (optional)
                                    </span>
                                </p>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="specialty"
                                        className="text-[#1F2D40]"
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
                                        className="text-[#1F2D40]"
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
                                        className="text-[#1F2D40]"
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
                            </div>
                        )}

                        {
                            /* address: required for clients, optional for the artist */
                            <div className="grid gap-4 rounded-2xl border border-[#EADDE3] bg-[#FCF8F8] p-4">
                                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1F2D40]">
                                    <MapPin className="h-4 w-4 text-[#5F83AB]" />{' '}
                                    {isArtist
                                        ? 'Studio address (optional)'
                                        : 'Address'}
                                </p>

                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="street_address"
                                        className="text-[#1F2D40]"
                                    >
                                        House no. / Street
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
                                            className="text-[#1F2D40]"
                                        >
                                            Barangay
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
                                            className="text-[#1F2D40]"
                                        >
                                            City / Municipality
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
                                            className="text-[#1F2D40]"
                                        >
                                            Province
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
                                            className="text-[#1F2D40]"
                                        >
                                            Postal code
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
                            className="w-full rounded-full bg-[#A8758B] text-white shadow-md shadow-[#B47B94]/25 transition duration-200 hover:bg-[#94677B] hover:shadow-lg disabled:opacity-50"
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}{' '}
                            Save changes
                        </Button>
                    </form>

                    <div className="mt-6 flex items-center justify-between gap-4 rounded-3xl border border-[#EADDE3] bg-white p-5 shadow-sm shadow-[#BDA6B5]/10">
                        <div>
                            <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1F2D40]">
                                <ShieldCheck className="h-4 w-4 text-[#5F83AB]" />{' '}
                                Password &amp; security
                            </p>
                            <p className="text-xs text-[#5B6B82]">
                                Change your password or manage two-factor
                                sign-in.
                            </p>
                        </div>
                        <Link
                            href="/settings/security"
                            className="shrink-0 rounded-full border border-[#95B1DB] px-4 py-1.5 text-sm font-semibold text-[#5F83AB] transition-colors duration-200 hover:bg-[#E6EEF8]"
                        >
                            Manage
                        </Link>
                    </div>
                </main>
            </div>

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
