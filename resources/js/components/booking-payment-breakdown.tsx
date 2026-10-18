type Props = {
    total: number | string;
    depositStatus?: 'not_due' | 'due' | 'submitted' | 'received';
    depositAmount?: number | string | null;
    remainingBalance?: number | string | null;
};

function formatCurrency(amount: number) {
    return amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export default function BookingPaymentBreakdown({
    total,
    depositStatus = 'not_due',
    depositAmount,
    remainingBalance,
}: Props) {
    const totalAmount = Number(total);
    const deposit = Number(depositAmount ?? totalAmount / 2);
    const isDepositReceived = depositStatus === 'received';
    const isDepositSubmitted = depositStatus === 'submitted';
    const remaining = isDepositReceived
        ? Number(remainingBalance ?? Math.max(0, totalAmount - deposit))
        : Math.max(0, totalAmount - deposit);
    const depositNote = {
        not_due: 'Not due yet',
        due: 'Due to secure booking',
        submitted: 'Sent · awaiting verification',
        received: 'Received',
    }[depositStatus];

    return (
        <section
            aria-label="Booking payment breakdown"
            className="mb-3 rounded-xl border border-[#e8d7cf] bg-[#fffcf8] px-4 py-3 text-sm text-[#4a4a4a]"
        >
            <dl className="grid gap-2">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-semibold text-[#1a1a1a]">
                    <dt>Total service fee</dt>
                    <dd>₱{formatCurrency(totalAmount)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <dt>50% deposit <span className="text-xs">({depositNote})</span></dt>
                    <dd>₱{formatCurrency(deposit)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-[#e8d7cf] pt-2 font-semibold text-[#1a1a1a]">
                    <dt>Remaining balance</dt>
                    <dd>₱{formatCurrency(remaining)}</dd>
                </div>
            </dl>
            {isDepositSubmitted && (
                <p className="mt-2 text-xs text-[#8a6a2f]">
                    Remaining balance is estimated until the deposit is verified.
                </p>
            )}
            {isDepositReceived && (
                <p className="mt-2 text-xs text-[#6b625e]">
                    {remaining > 0
                        ? 'Due on the service day. Updated for additional payments recorded by Trixie.'
                        : 'Paid in full.'}
                </p>
            )}
        </section>
    );
}
