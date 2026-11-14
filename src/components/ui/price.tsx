import { formatPrice } from "@/lib/format"
import { totalCents, type Discount } from "@/lib/discount"

export function Price({ priceCents, discount }: { priceCents: number; discount: Discount | null }) {
    if (!discount) return <>{formatPrice(priceCents)}</>

    return (
        <>
            <s>{formatPrice(priceCents)}</s> {formatPrice(totalCents(priceCents, discount))}
        </>
    )
}
