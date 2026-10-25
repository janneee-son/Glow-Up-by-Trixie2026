import { Head, router, usePage } from '@inertiajs/react';
import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import DashboardHeader from '@/components/dashboard-header';

type ArtistReview = {
    name: string;
    email: string;
    is_verified: boolean;
    identity_verified_at: string | null;
    payment_account_verified_at: string | null;
    last_reviewed_at: string | null;
    last_reviewed_by: number | null;
};

type Props = { artist: ArtistReview | null };

export default function TrustReview({ artist }: Props) {
    const { auth } = usePage<{
        auth?: { user?: { name?: string } };
    }>().props;
    const [identityChecked, setIdentityChecked] = useState(false);
    const [paymentAccountChecked, setPaymentAccountChecked] = useState(false);
    const [busy, setBusy] = useState(false);

    function recordChecks() {
        setBusy(true);
        router.post(
            '/admin/trust-review/verify',
            {
                identity_checked: identityChecked,
                payment_account_checked: paymentAccountChecked,
            },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    }

    function removeBadge() {
        setBusy(true);
        router.delete('/admin/trust-review/verify', {
            preserveScroll: true,
            onFinish: () => setBusy(false),
        });
    }

    return (
        <>
            <Head title="Artist trust review" />
            <div className="min-h-screen bg-[#faf7f5]">
                <DashboardHeader
                    userName={auth?.user?.name ?? 'Admin'}
                    userRole="admin"
                    active="trust-review"
                />
                <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                    <div className="mb-6">
                        <p className="text-sm font-semibold text-[#8a6a2f]">
                            Client trust
                        </p>
                        <h1 className="mt-1 font-display text-3xl font-bold text-[#1a1a1a]">
                            Artist identity review
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4a4a4a]">
                            Record a public trust badge only after an admin has
                            checked both the artist’s identity and ownership of
                            the payment account listed in the booking terms.
                            The app does not collect or store identity documents.
                        </p>
                    </div>

                    {!artist ? (
                        <section className="rounded-2xl border border-[#e8d7cf] bg-white p-5 text-sm text-[#4a4a4a] shadow-sm">
                            No artist profile is available to review.
                        </section>
                    ) : (
                        <section className="rounded-2xl border border-[#e8d7cf] bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f0e7e2] pb-5">
                                <div>
                                    <h2 className="text-xl font-semibold text-[#1a1a1a]">
                                        {artist.name}
                                    </h2>
                                    <p className="mt-1 text-sm text-[#6b625a]">
                                        {artist.email}
                                    </p>
                                </div>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${artist.is_verified ? 'bg-[#eaf4ea] text-[#2e6d43]' : 'bg-[#f4e9e5] text-[#8a6a2f]'}`}
                                >
                                    {artist.is_verified ? (
                                        <BadgeCheck className="h-4 w-4" />
                                    ) : (
                                        <ShieldCheck className="h-4 w-4" />
                                    )}
                                    {artist.is_verified
                                        ? 'Trust badge active'
                                        : 'Not yet reviewed'}
                                </span>
                            </div>

                            {artist.last_reviewed_at && (
                                <p className="mt-4 text-xs text-[#6b625a]">
                                    Last reviewed{' '}
                                    {new Date(
                                        artist.last_reviewed_at,
                                    ).toLocaleString()}
                                    {artist.last_reviewed_by
                                        ? ` · Admin #${artist.last_reviewed_by}`
                                        : ''}
                                </p>
                            )}

                            <div className="mt-5 space-y-4">
                                <label className="flex items-start gap-3 text-sm leading-5 text-[#34302d]">
                                    <input
                                        type="checkbox"
                                        checked={identityChecked}
                                        onChange={(event) =>
                                            setIdentityChecked(
                                                event.target.checked,
                                            )
                                        }
                                        className="mt-0.5 h-4 w-4 accent-[#8a6a2f]"
                                    />
                                    <span>
                                        I checked the artist’s identity against
                                        a valid government-issued ID through a
                                        private, trusted channel.
                                    </span>
                                </label>
                                <label className="flex items-start gap-3 text-sm leading-5 text-[#34302d]">
                                    <input
                                        type="checkbox"
                                        checked={paymentAccountChecked}
                                        onChange={(event) =>
                                            setPaymentAccountChecked(
                                                event.target.checked,
                                            )
                                        }
                                        className="mt-0.5 h-4 w-4 accent-[#8a6a2f]"
                                    />
                                    <span>
                                        I confirmed the GCash or bank account
                                        shown in the booking terms belongs to
                                        this artist.
                                    </span>
                                </label>
                            </div>

                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled={
                                        busy ||
                                        !identityChecked ||
                                        !paymentAccountChecked
                                    }
                                    onClick={recordChecks}
                                    className="rounded-full bg-[#8a6a2f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f5325] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {busy
                                        ? 'Saving…'
                                        : 'Record checks and show badge'}
                                </button>
                                {artist.is_verified && (
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={removeBadge}
                                        className="rounded-full border border-[#a13f3f] px-5 py-2.5 text-sm font-semibold text-[#a13f3f] transition hover:bg-[#a13f3f]/5 disabled:opacity-50"
                                    >
                                        Remove badge
                                    </button>
                                )}
                            </div>

                            <p className="mt-5 rounded-xl bg-[#faf7f5] p-4 text-xs leading-5 text-[#6b625a]">
                                The badge means a site admin reviewed these two
                                details. It does not mean the app holds a
                                client’s payment or guarantees a booking. Remove
                                the badge if the artist or payment details
                                change.
                            </p>
                        </section>
                    )}
                </main>
            </div>
        </>
    );
}
