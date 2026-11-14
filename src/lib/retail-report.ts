import type { PaymentMethod } from "@/generated/prisma/client"
import { discountCents, type Discount } from "@/lib/discount"
import { allocateDiscount, commissionCents } from "@/lib/commission"

export type RetailReportItem = {
    productId: string
    productName: string
    quantity: number
    unitPriceCents: number
}

export type RetailReportSale = {
    id: string
    soldAt: Date
    artistId: string | null
    appointmentId: string | null
    clientName: string | null
    discount: Discount | null
    taxRateMillipercent: number
    taxCents: number
    paymentMethod: PaymentMethod | null
    creditAppliedCents: number
    commissionBasisPoints: number | null
    commissionBackfilled: boolean
    items: RetailReportItem[]
}

export type RetailSaleFigures = {
    sale: RetailReportSale
    grossCents: number
    discountCents: number
    netCents: number
    taxCents: number
    totalCents: number
    lineNetCents: number[]
    commissionCents: number | null
}

export function retailSaleFigures(sale: RetailReportSale): RetailSaleFigures {
    const lineTotals = sale.items.map((item) => item.quantity * item.unitPriceCents)
    const grossCents = lineTotals.reduce((sum, cents) => sum + cents, 0)
    const off = discountCents(grossCents, sale.discount)
    const lineDiscounts = allocateDiscount(lineTotals, off)
    const netCents = grossCents - off
    return {
        sale,
        grossCents,
        discountCents: off,
        netCents,
        taxCents: sale.taxCents,
        totalCents: netCents + sale.taxCents,
        lineNetCents: lineTotals.map((cents, index) => cents - lineDiscounts[index]),
        commissionCents:
            sale.artistId === null
                ? 0
                : sale.commissionBasisPoints === null
                  ? null
                  : commissionCents(netCents, sale.commissionBasisPoints),
    }
}

export type RetailSummary = {
    saleCount: number
    unitCount: number
    grossCents: number
    discountCents: number
    netCents: number
    taxCents: number
    totalCents: number
    ratesBasisPoints: number[]
    salesWithoutRate: number
    commissionCents: number | null
    backfilledRateSales: number
}

export function retailSummary(figures: RetailSaleFigures[]): RetailSummary {
    const sum = (pick: (row: RetailSaleFigures) => number) =>
        figures.reduce((total, row) => total + pick(row), 0)
    const salesWithoutRate = figures.filter((row) => row.commissionCents === null).length
    const rates = new Set<number>()
    for (const row of figures) {
        if (row.sale.artistId !== null && row.sale.commissionBasisPoints !== null)
            rates.add(row.sale.commissionBasisPoints)
    }
    return {
        saleCount: figures.length,
        unitCount: sum((row) => row.sale.items.reduce((n, item) => n + item.quantity, 0)),
        grossCents: sum((row) => row.grossCents),
        discountCents: sum((row) => row.discountCents),
        netCents: sum((row) => row.netCents),
        taxCents: sum((row) => row.taxCents),
        totalCents: sum((row) => row.totalCents),
        ratesBasisPoints: [...rates].sort((a, b) => a - b),
        salesWithoutRate,
        commissionCents: salesWithoutRate > 0 ? null : sum((row) => row.commissionCents ?? 0),
        backfilledRateSales: figures.filter((row) => row.sale.commissionBackfilled).length,
    }
}

export type ProductSalesRow = {
    productId: string
    productName: string
    unitCount: number
    netCents: number
    shareOfSales: number | null
}

export function salesByProduct(figures: RetailSaleFigures[]): ProductSalesRow[] {
    const byProduct = new Map<
        string,
        { productName: string; unitCount: number; netCents: number }
    >()
    for (const row of figures) {
        row.sale.items.forEach((item, index) => {
            const entry = byProduct.get(item.productId) ?? {
                productName: item.productName,
                unitCount: 0,
                netCents: 0,
            }
            entry.unitCount += item.quantity
            entry.netCents += row.lineNetCents[index]
            byProduct.set(item.productId, entry)
        })
    }
    const all = [...byProduct.values()].reduce((sum, entry) => sum + entry.netCents, 0)
    return [...byProduct.entries()]
        .map(([productId, entry]) => ({
            productId,
            ...entry,
            shareOfSales: all === 0 ? null : entry.netCents / all,
        }))
        .sort((a, b) => b.netCents - a.netCents || a.productName.localeCompare(b.productName))
}

export type TaxRateRow = {
    taxRateMillipercent: number
    saleCount: number
    netCents: number
    taxCents: number
}

export function taxByRate(figures: RetailSaleFigures[]): TaxRateRow[] {
    const byRate = new Map<number, TaxRateRow>()
    for (const row of figures) {
        const rate = row.sale.taxRateMillipercent
        const entry = byRate.get(rate) ?? {
            taxRateMillipercent: rate,
            saleCount: 0,
            netCents: 0,
            taxCents: 0,
        }
        entry.saleCount += 1
        entry.netCents += row.netCents
        entry.taxCents += row.taxCents
        byRate.set(rate, entry)
    }
    return [...byRate.values()].sort((a, b) => a.taxRateMillipercent - b.taxRateMillipercent)
}
