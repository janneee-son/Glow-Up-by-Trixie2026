import BookingPaymentBreakdown from '@/components/booking-payment-breakdown';

type AddOn = {
    name: string;
    quantity: number;
    line_total: number | string | null;
    is_system_fee?: boolean;
};

type Props = {
    basePrice?: number | string | null;
    basePriceType?: 'fixed' | 'starting_at' | 'quote_required';
    finalMakeupPrice?: number | string | null;
    addOns?: AddOn[] | null;
    total?: number | string | null;
    quoteAccepted?: string | null;
    quotePending?: boolean;
    depositStatus?: 'not_due' | 'due' | 'submitted' | 'received';
    depositAmount?: number | string | null;
    remainingBalance?: number | string | null;
};

function amount(value: number | string) {
    return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BookingItemizedPricing({
    basePrice,
    basePriceType,
    finalMakeupPrice,
    addOns,
    total,
    quoteAccepted,
    quotePending = false,
    depositStatus = 'not_due',
    depositAmount,
    remainingBalance,
}: Props) {
    const transportation = addOns?.find((item) => item.is_system_fee && /transportation/i.test(item.name));
    const otherAddOns = addOns?.filter((item) => item !== transportation) ?? [];
    const accepted = Boolean(quoteAccepted);
    const hasPriceDetails = basePrice != null || finalMakeupPrice != null || Boolean(addOns?.length) || total != null;

    if (!hasPriceDetails) {
        return null;
    }

    return (
        <section className="mb-3 rounded-xl border border-[#e8d7cf] bg-[#fffcf8] p-4" aria-label="Itemized booking price">
            <h3 className="mb-3 text-sm font-semibold text-[#1a1a1a]">Price breakdown</h3>
            <dl className="grid gap-2 text-sm text-[#4a4a4a]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                    <dt>Makeup price</dt>
                    <dd className="text-right">
                        {finalMakeupPrice != null
                            ? amount(finalMakeupPrice)
                            : basePrice != null && basePriceType !== 'quote_required'
                              ? `${!accepted || basePriceType === 'starting_at' ? 'Starting at ' : ''}${amount(basePrice)}`
                              : 'Artist to quote'}
                    </dd>
                </div>
                {otherAddOns.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                        <dt className="break-words">{item.name}{item.quantity > 1 ? ` × ${item.quantity}` : ''}</dt>
                        <dd className="text-right">{item.line_total == null ? 'To be quoted' : amount(item.line_total)}</dd>
                    </div>
                ))}
                {transportation && (
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                        <dt>Transportation fee</dt>
                        <dd className="text-right">
                            {transportation.line_total == null ? 'To be quoted' : amount(transportation.line_total)}
                        </dd>
                    </div>
                )}
                {(accepted || quotePending) && total != null && (
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-[#e8d7cf] pt-2 font-semibold text-[#1a1a1a]">
                        <dt>{accepted ? 'Total service fee' : 'Total quote for approval'}</dt>
                        <dd className="text-right">{amount(total)}</dd>
                    </div>
                )}
            </dl>
            {accepted && total != null && (
                <div className="mt-3 border-t border-[#e8d7cf] pt-3">
                    <BookingPaymentBreakdown
                        total={total}
                        depositStatus={depositStatus}
                        depositAmount={depositAmount}
                        remainingBalance={remainingBalance}
                        showTotal={false}
                    />
                </div>
            )}
        </section>
    );
}
