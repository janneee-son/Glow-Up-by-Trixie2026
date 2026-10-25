import { BadgeCheck, CalendarDays, Clock3, CircleDollarSign } from 'lucide-react';

type BalancePayment = {
    id: number;
    amount: number | string;
    method: 'gcash' | 'bank_transfer' | 'cash' | 'other';
    reference: string | null;
    paid_at: string;
};

type BookingActivity = {
    created_at: string;
    updated_at: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    cancelled_by?: 'client' | 'artist' | null;
    quote_accepted_at?: string | null;
    quote_pending?: boolean;
    transportation_fee_pending?: boolean;
    estimated_total?: number | string | null;
    deposit_status?: 'not_due' | 'due' | 'submitted' | 'received';
    deposit_amount?: number | string | null;
    deposit_method?: 'gcash' | 'bank_transfer' | 'cash' | null;
    deposit_reference?: string | null;
    deposit_proof_url?: string | null;
    deposit_submitted_at?: string | null;
    deposit_received_at?: string | null;
    confirmed_at?: string | null;
    completed_at?: string | null;
    cancelled_at?: string | null;
    balance_payments?: BalancePayment[];
};

type Props = {
    booking: BookingActivity;
};

type TimelineStep = {
    title: string;
    detail?: string;
    date?: string | null;
    state: 'done' | 'current' | 'upcoming';
};

function formatDateTime(value?: string | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatDate(value: string): string {
    const date = new Date(`${value.slice(0, 10)}T12:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('en-PH', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          });
}

function money(value: number | string | null | undefined): string | null {
    if (value == null || value === '') return null;
    const amount = Number(value);
    if (!Number.isFinite(amount)) return null;

    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function paymentMethod(value?: string | null): string | null {
    if (!value) return null;

    return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildSteps(booking: BookingActivity): TimelineStep[] {
    const steps: TimelineStep[] = [
        {
            title: 'Booking request sent',
            date: booking.created_at,
            state: 'done',
        },
    ];

    if (booking.quote_accepted_at) {
        steps.push({
            title: 'Final quote accepted',
            date: booking.quote_accepted_at,
            state: 'done',
        });
    } else if (booking.quote_pending || booking.transportation_fee_pending) {
        steps.push({
            title: 'Final quote sent',
            detail: 'Waiting for the client to review it.',
            state: 'current',
        });
    } else if (booking.status === 'pending' && booking.deposit_status === 'not_due') {
        steps.push({
            title: 'Final quote in progress',
            detail: 'The final total is being prepared.',
            state: 'current',
        });
    }

    if (booking.deposit_status === 'due') {
        const depositDue = money(
            booking.estimated_total == null
                ? null
                : Number(booking.estimated_total) / 2,
        );
        steps.push({
            title: '50% deposit due',
            detail: depositDue ? `${depositDue} to pay` : undefined,
            state: 'current',
        });
    } else if (booking.deposit_status === 'submitted') {
        steps.push({
            title: 'Deposit submitted',
            detail: 'Awaiting payment confirmation.',
            date: booking.deposit_submitted_at,
            state: 'current',
        });
    } else if (booking.deposit_status === 'received') {
        steps.push({
            title: 'Deposit confirmed',
            detail: 'Trixie marked the deposit as received.',
            date: booking.deposit_received_at,
            state: 'done',
        });
    }

    if (booking.status === 'confirmed') {
        steps.push({
            title: 'Appointment confirmed',
            date: booking.confirmed_at,
            state: 'done',
        });
    } else if (booking.status === 'completed') {
        steps.push({
            title: 'Session completed',
            date: booking.completed_at,
            state: 'done',
        });
    } else if (booking.status === 'cancelled') {
        steps.push({
            title: 'Booking cancelled',
            detail:
                booking.cancelled_by === 'artist'
                    ? 'Cancelled by Trixie.'
                    : booking.cancelled_by === 'client'
                      ? 'Cancelled by the client.'
                      : undefined,
            date: booking.cancelled_at,
            state: 'done',
        });
    } else {
        steps.push({
            title: 'Appointment awaiting confirmation',
            detail: 'The appointment can be confirmed after the deposit is verified.',
            state: 'upcoming',
        });
    }

    return steps;
}

export default function BookingActivityTimeline({ booking }: Props) {
    const steps = buildSteps(booking);
    const payments = booking.balance_payments ?? [];
    const depositAmount =
        booking.deposit_amount ??
        (booking.estimated_total == null
            ? null
            : Number(booking.estimated_total) / 2);
    const hasDepositRecord =
        booking.deposit_status === 'submitted' ||
        booking.deposit_status === 'received';
    const hasPaymentRecords = hasDepositRecord || payments.length > 0;

    return (
        <details className="mb-4 overflow-hidden rounded-xl border border-[#e8d7cf] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#1a1a1a] marker:hidden">
                <span className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-[#8a6a2f]" />
                    Booking and payment history
                </span>
                <span className="text-xs font-medium text-[#8a6a2f]">
                    View
                </span>
            </summary>

            <div className="border-t border-[#f0e7e2] px-4 py-4">
                <h3 className="text-xs font-bold tracking-wide text-[#8a6a2f] uppercase">
                    Booking progress
                </h3>
                <ol className="mt-3 space-y-3">
                    {steps.map((step, index) => (
                        <li key={`${step.title}-${index}`} className="flex gap-3">
                            <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.state === 'done' ? 'bg-[#eaf4ea] text-[#2e6d43]' : step.state === 'current' ? 'bg-[#f4e9e5] text-[#8a6a2f]' : 'bg-[#f4f1ee] text-[#8b8179]'}`}
                            >
                                {step.state === 'done' ? (
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-[#1a1a1a]">
                                    {step.title}
                                </p>
                                {step.detail && (
                                    <p className="mt-0.5 text-xs leading-5 text-[#6b625a]">
                                        {step.detail}
                                    </p>
                                )}
                                {formatDateTime(step.date) && (
                                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#8b8179]">
                                        <CalendarDays className="h-3 w-3" />
                                        {formatDateTime(step.date)}
                                    </p>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>

                <div className="mt-5 border-t border-[#f0e7e2] pt-4">
                    <h3 className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#8a6a2f] uppercase">
                        <CircleDollarSign className="h-4 w-4" />
                    Payment history
                    </h3>

                    {!hasPaymentRecords ? (
                        <p className="mt-2 text-xs text-[#6b625a]">
                            No payments have been recorded for this booking yet.
                        </p>
                    ) : (
                        <ul className="mt-2 space-y-3">
                            {hasDepositRecord && (
                                <li className="rounded-lg bg-[#faf7f4] p-3 text-xs">
                                    <p className="font-semibold text-[#1a1a1a]">
                                        50% deposit ·{' '}
                                        {booking.deposit_status === 'received'
                                            ? 'Confirmed by Trixie'
                                            : 'Submitted, awaiting confirmation'}
                                    </p>
                                    <p className="mt-1 text-[#4a4a4a]">
                                        {[money(depositAmount), paymentMethod(booking.deposit_method)]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                    {booking.deposit_reference && (
                                        <p className="mt-1 break-all text-[#6b625a]">
                                            Reference: {booking.deposit_reference}
                                        </p>
                                    )}
                                    {formatDateTime(
                                        booking.deposit_status === 'received'
                                            ? booking.deposit_received_at
                                            : booking.deposit_submitted_at,
                                    ) && (
                                        <p className="mt-1 text-[#8b8179]">
                                            {formatDateTime(
                                                booking.deposit_status === 'received'
                                                    ? booking.deposit_received_at
                                                    : booking.deposit_submitted_at,
                                            )}
                                        </p>
                                    )}
                                    {booking.deposit_proof_url && (
                                        <a
                                            href={booking.deposit_proof_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-block font-semibold text-[#8a6a2f] underline underline-offset-2"
                                        >
                                            View uploaded proof
                                        </a>
                                    )}
                                </li>
                            )}
                            {payments.map((payment) => (
                                <li
                                    key={payment.id}
                                    className="rounded-lg bg-[#faf7f4] p-3 text-xs"
                                >
                                    <p className="font-semibold text-[#1a1a1a]">
                                        Balance payment · {money(payment.amount)}
                                    </p>
                                    <p className="mt-1 text-[#4a4a4a]">
                                        {[paymentMethod(payment.method), formatDate(payment.paid_at)]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                    {payment.reference && (
                                        <p className="mt-1 break-all text-[#6b625a]">
                                            Reference: {payment.reference}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="mt-3 text-xs leading-5 text-[#8b8179]">
                        A submitted deposit is not marked paid until Trixie
                        confirms it. Payments are sent directly to Trixie; this
                        app does not hold the money.
                    </p>
                </div>
            </div>
        </details>
    );
}
