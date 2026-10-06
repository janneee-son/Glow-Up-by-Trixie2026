import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Briefcase,
    Mail,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    User as UserIcon,
} from 'lucide-react';
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
    'w-full rounded-xl border border-[#95B1DB] bg-[#FAFCFE] px-3 py-2 text-sm text-[#1F2D40] focus-visible:border-[#769AD0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#769AD0]/40';

export default function EditProfile({ user }: Props) {
    const { auth } = usePage<{
        auth?: { user?: { name?: string; role?: 'client' | 'artist' | 'admin' } };
    }>().props;

    const isArtist = user.role === 'artist';

    const { data, setData, patch, processing, errors, isDirty } = useForm({
        name: user.name,
        phone: user.phone ?? '',
        street_address: user.street_address ?? '',
        barangay: user.barangay ?? '',
        city: user.city ?? '',
        province: user.province ?? '',
        postal_code: user.postal_code ?? '',
        specialty: user.specialty ?? '',
        years_experience: user.years_experience != null ? String(user.years_experience) : '',
        bio: user.bio ?? '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        patch('/profile', { preserveScroll: true });
    }

    return (
        <>
            <Head title="Profile" />

            <div className="min-h-screen bg-[#F2F5F8]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'there'}
                    userRole={auth?.user?.role}
                    active="profile"
                />

                <div className="mx-auto max-w-2xl px-6 py-10 md:px-12">
                    <div className="mb-6">
                        <p className="mb-1 text-xs tracking-widest text-[#5F83AB] uppercase">
                            Profile
                        </p>
                        <h1 className="font-serif text-3xl font-bold text-[#1F2D40]">
                            Your details
                        </h1>
                        <p className="mt-1 text-sm text-[#5B6B82]">
                            {isArtist
                                ? 'These details are shown to clients on the booking page.'
                                : 'Your artist uses these to reach you about your bookings.'}
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-6 rounded-2xl border border-[#D3DFEF] bg-white p-6"
                    >
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

                        {isArtist ? (
                            /* artist details */
                            <div className="grid gap-4 rounded-xl border border-[#95B1DB]/60 bg-[#EDF3FA] p-4">
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
                        ) : (
                            /* client address */
                            <div className="grid gap-4 rounded-xl border border-[#95B1DB]/60 bg-[#EDF3FA] p-4">
                                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#1F2D40]">
                                    <MapPin className="h-4 w-4 text-[#5F83AB]" />{' '}
                                    Address
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
                                        required
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
                                            required
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
                                            required
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
                                            required
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
                                            required
                                            className={fieldClass}
                                        />
                                        <InputError
                                            message={errors.postal_code}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={processing || !isDirty}
                            className="w-full rounded-full bg-[#5F83AB] text-white shadow-md shadow-[#95B1DB]/50 transition duration-200 hover:bg-[#4E7099] hover:shadow-lg disabled:opacity-50"
                        >
                            {processing ? (
                                <Spinner />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}{' '}
                            Save changes
                        </Button>
                    </form>

                    <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[#D3DFEF] bg-white p-5">
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
                </div>
            </div>
        </>
    );
}
    