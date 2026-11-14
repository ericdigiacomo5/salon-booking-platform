import type { DiscountType } from "@/generated/prisma/client"
import { formatPrice } from "@/lib/format"

export type Discount = { type: DiscountType; value: number }

export function discountOf(appointment: {
    discountType: DiscountType | null
    discountValue: number | null
}): Discount | null {
    if (appointment.discountType === null || appointment.discountValue === null) return null
    return { type: appointment.discountType, value: appointment.discountValue }
}

export function discountCents(priceCents: number, discount: Discount | null): number {
    if (!discount) return 0
    const off =
        discount.type === "PERCENT"
            ? Math.round((priceCents * discount.value) / 100)
            : discount.value
    return Math.min(off, priceCents)
}

export function totalCents(priceCents: number, discount: Discount | null): number {
    return priceCents - discountCents(priceCents, discount)
}

export function amountDueCents(
    priceCents: number,
    discount: Discount | null,
    creditAppliedCents: number,
): number {
    return Math.max(0, totalCents(priceCents, discount) - creditAppliedCents)
}

export function describeDiscount(discount: Discount): string {
    return discount.type === "PERCENT"
        ? `${discount.value}% off`
        : `${formatPrice(discount.value)} off`
}

export function discountError(
    discount: { type: unknown; value: unknown },
    priceCents: number,
): string | null {
    if (discount.type !== "PERCENT" && discount.type !== "AMOUNT") {
        return "Discount type must be PERCENT or AMOUNT"
    }
    if (
        typeof discount.value !== "number" ||
        !Number.isInteger(discount.value) ||
        discount.value < 1
    ) {
        return discount.type === "PERCENT"
            ? "Percentage must be a whole number from 1 to 100"
            : "Amount must be at least $0.01"
    }
    if (discount.type === "PERCENT" && discount.value > 100) {
        return "Percentage must be a whole number from 1 to 100"
    }
    if (discount.type === "AMOUNT" && discount.value > priceCents) {
        return "Amount can't be more than the service price"
    }
    return null
}
