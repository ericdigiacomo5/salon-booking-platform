import type { PaymentMethod } from "@/generated/prisma/client"
import { discountCents, type Discount } from "@/lib/discount"
import { addDays } from "@/lib/recurring"
import { startOfDay, startOfMonth } from "@/lib/schedule-grid"
import { compareCategories } from "@/lib/service-category"
import { formatSalonDate, zonedParts, zonedToInstant } from "@/lib/salon-time"
import { allocateDiscount, commissionCents } from "@/lib/commission"
import { retailSummary, type RetailSaleFigures } from "@/lib/retail-report"

export type PayReportCategory = { id: string; name: string; position: number }

export type PayReportLine = {
    serviceId: string
    serviceName: string
    category: PayReportCategory
    priceCents: number
    serviceFeeCents: number
}

export type PayReportVisit = {
    id: string
    artistId: string
    startTime: Date
    createdAt: Date
    clientName: string | null
    discount: Discount | null
    paymentMethod: PaymentMethod | null
    creditAppliedCents: number
    commissionBasisPoints: number | null
    commissionBackfilled: boolean
    lines: PayReportLine[]
}

export const LINE_PRICES_RECORDED_FROM = zonedToInstant(2026, 10, 13)

export { allocateDiscount, commissionCents }

export type VisitFigures = {
    visit: PayReportVisit
    grossCents: number
    discountCents: number
    salesCents: number
    lineSalesCents: number[]
    commissionCents: number | null
    serviceFeeCents: number
}

export function visitFigures(visit: PayReportVisit): VisitFigures {
    const prices = visit.lines.map((line) => line.priceCents)
    const grossCents = prices.reduce((sum, cents) => sum + cents, 0)
    const discount = discountCents(grossCents, visit.discount)
    const lineDiscounts = allocateDiscount(prices, discount)
    const salesCents = grossCents - discount

    return {
        visit,
        grossCents,
        discountCents: discount,
        salesCents,
        lineSalesCents: prices.map((cents, index) => cents - lineDiscounts[index]),
        commissionCents:
            visit.commissionBasisPoints === null
                ? null
                : commissionCents(salesCents, visit.commissionBasisPoints),
        serviceFeeCents: visit.lines.reduce((sum, line) => sum + line.serviceFeeCents, 0),
    }
}

export type ServiceSalesRow = {
    serviceId: string
    serviceName: string
    count: number
    salesCents: number
    averageCents: number | null
    shareOfSales: number | null
    serviceFeeCents: number
}

export type SalesTotals = Omit<ServiceSalesRow, "serviceId" | "serviceName">

export type CategorySales = {
    category: string
    label: string
    rows: ServiceSalesRow[]
    totals: SalesTotals
}

export type SalesByService = { categories: CategorySales[]; totals: SalesTotals }

function totalsOf(
    rows: { count: number; salesCents: number; serviceFeeCents: number }[],
    allSalesCents: number,
) {
    const count = rows.reduce((sum, row) => sum + row.count, 0)
    const salesCents = rows.reduce((sum, row) => sum + row.salesCents, 0)
    return {
        count,
        salesCents,
        averageCents: count === 0 ? null : Math.round(salesCents / count),
        shareOfSales: allSalesCents === 0 ? null : salesCents / allSalesCents,
        serviceFeeCents: rows.reduce((sum, row) => sum + row.serviceFeeCents, 0),
    }
}

export function salesByService(figures: VisitFigures[]): SalesByService {
    const byService = new Map<
        string,
        {
            serviceName: string
            category: PayReportCategory
            count: number
            salesCents: number
            serviceFeeCents: number
        }
    >()

    for (const visit of figures) {
        visit.visit.lines.forEach((line, index) => {
            const row = byService.get(line.serviceId) ?? {
                serviceName: line.serviceName,
                category: line.category,
                count: 0,
                salesCents: 0,
                serviceFeeCents: 0,
            }
            row.count += 1
            row.salesCents += visit.lineSalesCents[index]
            row.serviceFeeCents += line.serviceFeeCents
            byService.set(line.serviceId, row)
        })
    }

    const allSalesCents = [...byService.values()].reduce((sum, row) => sum + row.salesCents, 0)

    const soldCategories = [
        ...new Map([...byService.values()].map((row) => [row.category.id, row.category])).values(),
    ].sort(compareCategories)

    const categories: CategorySales[] = []
    for (const category of soldCategories) {
        const rows: ServiceSalesRow[] = [...byService.entries()]
            .filter(([, row]) => row.category.id === category.id)
            .map(([serviceId, row]) => ({
                serviceId,
                serviceName: row.serviceName,
                ...totalsOf([row], allSalesCents),
            }))
            .sort(
                (a, b) => b.salesCents - a.salesCents || a.serviceName.localeCompare(b.serviceName),
            )
        categories.push({
            category: category.id,
            label: category.name,
            rows,
            totals: totalsOf(rows, allSalesCents),
        })
    }

    return { categories, totals: totalsOf([...byService.values()], allSalesCents) }
}

export type PaySummary = {
    visitCount: number
    serviceCount: number
    grossCents: number
    discountCents: number
    salesCents: number
    ratesBasisPoints: number[]
    visitsWithoutRate: number
    commissionCents: number | null
    serviceFeeCents: number
    takeHomeCents: number | null
    salonKeepsCents: number | null
    backfilledRateVisits: number
    backfilledPriceVisits: number
    retailSaleCount: number
    retailSalesCents: number
    retailRatesBasisPoints: number[]
    retailSalesWithoutRate: number
    retailCommissionCents: number | null
}

export function paySummary(figures: VisitFigures[], retail: RetailSaleFigures[] = []): PaySummary {
    const sum = (pick: (visit: VisitFigures) => number) =>
        figures.reduce((total, visit) => total + pick(visit), 0)

    const visitsWithoutRate = figures.filter((visit) => visit.commissionCents === null).length
    const salesCents = sum((visit) => visit.salesCents)
    const serviceFeeCents = sum((visit) => visit.serviceFeeCents)
    const commission = visitsWithoutRate > 0 ? null : sum((visit) => visit.commissionCents ?? 0)
    const retailTotals = retailSummary(retail)
    const takeHome =
        commission === null || retailTotals.commissionCents === null
            ? null
            : commission - serviceFeeCents + retailTotals.commissionCents

    const rates = new Set<number>()
    for (const visit of figures) {
        if (visit.visit.commissionBasisPoints !== null) rates.add(visit.visit.commissionBasisPoints)
    }

    return {
        visitCount: figures.length,
        serviceCount: sum((visit) => visit.visit.lines.length),
        grossCents: sum((visit) => visit.grossCents),
        discountCents: sum((visit) => visit.discountCents),
        salesCents,
        ratesBasisPoints: [...rates].sort((a, b) => a - b),
        visitsWithoutRate,
        commissionCents: commission,
        serviceFeeCents,
        takeHomeCents: takeHome,
        salonKeepsCents: takeHome === null ? null : salesCents + retailTotals.netCents - takeHome,
        backfilledRateVisits: figures.filter((visit) => visit.visit.commissionBackfilled).length,
        backfilledPriceVisits: figures.filter(
            (visit) => visit.visit.createdAt < LINE_PRICES_RECORDED_FROM,
        ).length,
        retailSaleCount: retailTotals.saleCount,
        retailSalesCents: retailTotals.netCents,
        retailRatesBasisPoints: retailTotals.ratesBasisPoints,
        retailSalesWithoutRate: retailTotals.salesWithoutRate,
        retailCommissionCents: retailTotals.commissionCents,
    }
}

export const MAX_REPORT_DAYS = 366

export const DEFAULT_REPORT_DAYS = 14

export type ReportPreset = { label: string; from: Date; to: Date }

export function reportPresets(today: Date): ReportPreset[] {
    const day = startOfDay(today)
    const monthStart = startOfMonth(day)
    const lastMonthEnd = addDays(monthStart, -1)
    return [
        { label: "Last 7 days", from: addDays(day, -6), to: day },
        { label: "Last 14 days", from: addDays(day, -(DEFAULT_REPORT_DAYS - 1)), to: day },
        { label: "This month", from: monthStart, to: day },
        { label: "Last month", from: startOfMonth(lastMonthEnd), to: lastMonthEnd },
    ]
}

export function daysInRange(from: Date, to: Date): number {
    return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000) + 1
}

export function rangeError(from: Date, to: Date): string | null {
    if (from > to) return "The start date must be on or before the end date."
    if (daysInRange(from, to) > MAX_REPORT_DAYS)
        return `A report can cover at most ${MAX_REPORT_DAYS} days.`
    return null
}

export function formatDateRange(from: Date, to: Date): string {
    const f = zonedParts(from)
    const t = zonedParts(to)
    const sameYear = f.year === t.year
    const sameMonth = sameYear && f.month === t.month
    const end = formatSalonDate(to, { month: "short", day: "numeric", year: "numeric" })
    if (sameMonth && f.day === t.day) return end
    const start = formatSalonDate(
        from,
        sameYear
            ? { month: "short", day: "numeric" }
            : { month: "short", day: "numeric", year: "numeric" },
    )
    const endText = sameMonth ? `${t.day}, ${t.year}` : end
    return `${start} – ${endText}`
}

export function clientShortName(name: string | null): string | null {
    const parts = (name ?? "").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return null
    return parts.length === 1
        ? parts[0]
        : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

export function formatRate(basisPoints: number): string {
    return `${Number((basisPoints / 100).toFixed(2))}%`
}

export function formatShare(fraction: number | null): string {
    return fraction === null ? "—" : `${(fraction * 100).toFixed(1)}%`
}

export function percentToBasisPoints(text: string): number | null {
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(text.trim())) return null
    const basisPoints = Math.round(Number(text.trim()) * 100)
    return basisPoints <= 10_000 ? basisPoints : null
}

export function isBasisPoints(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10_000
}

export const MAX_SERVICE_FEE_CENTS = 100_000

export function isFeeCents(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= MAX_SERVICE_FEE_CENTS
    )
}
