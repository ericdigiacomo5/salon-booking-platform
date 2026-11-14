import type { DiscountType } from "@/generated/prisma/client"
import { discountCents, type Discount } from "@/lib/discount"

export const MAX_RETAIL_LINES = 20
export const MAX_RETAIL_QUANTITY = 99

export const MAX_PRODUCT_PRICE_CENTS = 1_000_000

export const MAX_TAX_RATE_MILLIPERCENT = 25_000
export const DEFAULT_TAX_RATE_MILLIPERCENT = 8_625

export type RetailLine = { quantity: number; unitPriceCents: number }

export function lineTotalCents(line: RetailLine): number {
    return line.quantity * line.unitPriceCents
}

export function retailSubtotalCents(lines: RetailLine[]): number {
    return lines.reduce((sum, line) => sum + lineTotalCents(line), 0)
}

export function salesTaxCents(taxableCents: number, taxRateMillipercent: number): number {
    return Math.round((taxableCents * taxRateMillipercent) / 100_000)
}

export type RetailTotals = {
    subtotalCents: number
    discountCents: number
    netCents: number
    taxCents: number
    totalCents: number
}

export function retailTotals(
    lines: RetailLine[],
    discount: Discount | null,
    taxRateMillipercent: number,
): RetailTotals {
    const subtotal = retailSubtotalCents(lines)
    const off = discountCents(subtotal, discount)
    const net = subtotal - off
    const tax = salesTaxCents(net, taxRateMillipercent)
    return {
        subtotalCents: subtotal,
        discountCents: off,
        netCents: net,
        taxCents: tax,
        totalCents: net + tax,
    }
}

export function savedSaleTotals(sale: {
    items: RetailLine[]
    discountType: DiscountType | null
    discountValue: number | null
    taxCents: number
}): RetailTotals {
    const subtotal = retailSubtotalCents(sale.items)
    const discount =
        sale.discountType !== null && sale.discountValue !== null
            ? { type: sale.discountType, value: sale.discountValue }
            : null
    const off = discountCents(subtotal, discount)
    const net = subtotal - off
    return {
        subtotalCents: subtotal,
        discountCents: off,
        netCents: net,
        taxCents: sale.taxCents,
        totalCents: net + sale.taxCents,
    }
}

export type RetailItemRequest = { productId: string; quantity: number }

export function parseRetailItems(value: unknown): RetailItemRequest[] | string {
    if (!Array.isArray(value)) return "Products must be a list"
    if (value.length > MAX_RETAIL_LINES)
        return `A sale can have at most ${MAX_RETAIL_LINES} different products`

    const items: RetailItemRequest[] = []
    const seen = new Set<string>()
    for (const entry of value) {
        if (typeof entry !== "object" || entry === null) return "Each product must be an object"
        const { productId, quantity } = entry as Record<string, unknown>
        if (typeof productId !== "string" || !productId) return "Each product needs a productId"
        if (
            typeof quantity !== "number" ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > MAX_RETAIL_QUANTITY
        ) {
            return `Quantity must be a whole number from 1 to ${MAX_RETAIL_QUANTITY}`
        }
        if (seen.has(productId)) return "Each product can only be listed once"
        seen.add(productId)
        items.push({ productId, quantity })
    }
    return items
}

export function isTaxRateMillipercent(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= MAX_TAX_RATE_MILLIPERCENT
    )
}

export function percentToMillipercent(text: string): number | null {
    const trimmed = text.trim()
    if (!/^\d{1,2}(\.\d{1,3})?$/.test(trimmed)) return null
    const value = Math.round(Number(trimmed) * 1000)
    return value <= MAX_TAX_RATE_MILLIPERCENT ? value : null
}

export function formatTaxRate(millipercent: number): string {
    return `${Number((millipercent / 1000).toFixed(3))}%`
}

export function isProductPriceCents(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= MAX_PRODUCT_PRICE_CENTS
    )
}
