import Link from "next/link"
import { PAYMENT_METHOD_LABEL } from "@/components/admin/appointment-shared"
import { formatPrice } from "@/lib/format"
import { SITE_NAME } from "@/lib/site"
import {
    formatRate,
    formatShare,
    LINE_PRICES_RECORDED_FROM,
    paySummary,
    salesByService,
    type PaySummary,
    type VisitFigures,
} from "@/lib/pay-report"
import { SalesTable } from "./sales-table"
import { ProductSalesTable } from "./product-sales-table"
import { formatSalonDate, formatSalonDateTime, formatSalonTime } from "@/lib/salon-time"
import { salesByProduct, type RetailSaleFigures } from "@/lib/retail-report"

function plural(count: number, word: string): string {
    return `${count} ${word}${count === 1 ? "" : "s"}`
}

function rateText(summary: PaySummary): string {
    if (summary.ratesBasisPoints.length === 0) return "Not set"
    const rates = summary.ratesBasisPoints.map(formatRate).join(" / ")
    if (summary.visitsWithoutRate > 0)
        return `${rates} (not set for ${plural(summary.visitsWithoutRate, "visit")})`
    return summary.ratesBasisPoints.length > 1 ? `${rates} (changed during this period)` : rates
}

function retailRateText(summary: PaySummary): string {
    if (summary.retailRatesBasisPoints.length === 0) return "Not set"
    const rates = summary.retailRatesBasisPoints.map(formatRate).join(" / ")
    if (summary.retailSalesWithoutRate > 0)
        return `${rates} (not set for ${plural(summary.retailSalesWithoutRate, "sale")})`
    return summary.retailRatesBasisPoints.length > 1
        ? `${rates} (changed during this period)`
        : rates
}

function paidBy(visit: VisitFigures["visit"]): string {
    const method = visit.paymentMethod ? PAYMENT_METHOD_LABEL[visit.paymentMethod] : null
    if (visit.creditAppliedCents > 0) return method ? `${method} + store credit` : "Store credit"
    return method ?? "Nothing due"
}

function visitWhen(date: Date): string {
    const day = formatSalonDate(date, {
        weekday: "short",
        month: "short",
        day: "numeric",
    })
    const time = formatSalonTime(date)
    return `${day}, ${time}`
}

function SummaryRow({
    label,
    value,
    strong = false,
}: {
    label: string
    value: string
    strong?: boolean
}) {
    return (
        <div
            className={
                "flex items-baseline justify-between gap-4 py-1.5 print:py-0.5 " +
                (strong ? "border-t border-border/40 font-semibold text-foreground" : "")
            }
        >
            <dt>{label}</dt>
            <dd className="text-right tabular-nums">{value}</dd>
        </div>
    )
}

export function PaySheet({
    artistId,
    artistName,
    periodLabel,
    figures,
    retail = [],
    showVisits,
    generatedAt,
}: {
    artistId: string
    artistName: string
    periodLabel: string
    figures: VisitFigures[]
    retail?: RetailSaleFigures[]
    showVisits: boolean
    generatedAt: Date
}) {
    const summary = paySummary(figures, retail)
    const sales = salesByService(figures)
    const hasRetail = retail.length > 0
    const headingId = `pay-sheet-${artistId}`

    return (
        <section
            aria-labelledby={headingId}
            className="pay-sheet rounded-lg border border-line bg-surface shadow-sm print:shadow-none p-4 text-surface-foreground sm:p-6 print:border-0 print:p-0"
        >
            <header className="flex flex-col gap-1 border-b-2 border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{`${SITE_NAME} · Pay report`}</p>
                    <h3
                        id={headingId}
                        className="font-serif text-2xl font-semibold text-foreground"
                    >
                        {artistName}
                    </h3>
                </div>
                <p className="text-sm font-medium">{periodLabel}</p>
            </header>

            <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr] print:grid-cols-1 print:gap-4">
                <dl className="text-sm print:max-w-sm">
                    <SummaryRow
                        label="Visits"
                        value={`${plural(summary.visitCount, "visit")} · ${plural(summary.serviceCount, "service")}`}
                    />
                    <SummaryRow
                        label="Sales before discounts"
                        value={formatPrice(summary.grossCents)}
                    />
                    <SummaryRow
                        label="Discounts"
                        value={
                            summary.discountCents === 0
                                ? formatPrice(0)
                                : `−${formatPrice(summary.discountCents)} (${formatShare(summary.discountCents / summary.grossCents)})`
                        }
                    />
                    <SummaryRow
                        label="Total sales"
                        value={formatPrice(summary.salesCents)}
                        strong
                    />
                    <SummaryRow label="Commission rate" value={rateText(summary)} />
                    <SummaryRow
                        label="Commission earned"
                        value={
                            summary.commissionCents === null
                                ? "Unknown"
                                : formatPrice(summary.commissionCents)
                        }
                    />
                    <SummaryRow
                        label="Service fees"
                        value={
                            summary.serviceFeeCents === 0
                                ? formatPrice(0)
                                : `−${formatPrice(summary.serviceFeeCents)}`
                        }
                    />
                    {hasRetail && (
                        <>
                            <SummaryRow
                                label="Retail sales (before tax)"
                                value={`${formatPrice(summary.retailSalesCents)} · ${plural(summary.retailSaleCount, "sale")}`}
                            />
                            <SummaryRow
                                label="Retail commission rate"
                                value={retailRateText(summary)}
                            />
                            <SummaryRow
                                label="Retail commission earned"
                                value={
                                    summary.retailCommissionCents === null
                                        ? "Unknown"
                                        : formatPrice(summary.retailCommissionCents)
                                }
                            />
                        </>
                    )}
                    <SummaryRow
                        label="Take-home"
                        value={
                            summary.takeHomeCents === null
                                ? "Unknown"
                                : formatPrice(summary.takeHomeCents)
                        }
                        strong
                    />
                    <SummaryRow
                        label="Salon keeps"
                        value={
                            summary.salonKeepsCents === null
                                ? "Unknown"
                                : summary.salesCents === 0
                                  ? formatPrice(summary.salonKeepsCents)
                                  : `${formatPrice(summary.salonKeepsCents)} (${formatShare(summary.salonKeepsCents / summary.salesCents)})`
                        }
                    />
                </dl>

                <div className="min-w-0">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Sales by service
                    </h4>
                    <SalesTable
                        sales={sales}
                        caption={`Sales by service for ${artistName}, ${periodLabel}`}
                    />
                    {hasRetail && (
                        <>
                            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Products sold
                            </h4>
                            <ProductSalesTable
                                rows={salesByProduct(retail)}
                                caption={`Products sold by ${artistName}, ${periodLabel}`}
                            />
                        </>
                    )}
                </div>
            </div>

            {showVisits && hasRetail && (
                <div className="mt-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Retail sales
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-2xl border-collapse text-sm print:min-w-0 print:text-xs">
                            <caption className="sr-only">{`Retail sales by ${artistName}, ${periodLabel}`}</caption>
                            <thead>
                                <tr className="border-b-2 border-border text-xs uppercase tracking-wide text-muted-foreground">
                                    <th scope="col" className="py-2 pr-2 text-left font-medium">
                                        Date
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-left font-medium">
                                        Client
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-left font-medium">
                                        Products
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">
                                        Sales
                                    </th>
                                    <th scope="col" className="py-2 pl-2 text-right font-medium">
                                        Commission
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {retail.map((row) => (
                                    <tr
                                        key={row.sale.id}
                                        className="break-inside-avoid border-b border-border/15 align-top"
                                    >
                                        <td className="py-1.5 pr-2 whitespace-nowrap">
                                            {visitWhen(row.sale.soldAt)}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {row.sale.clientName ?? "—"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {row.sale.items
                                                .map((item) =>
                                                    item.quantity > 1
                                                        ? `${item.productName} ×${item.quantity}`
                                                        : item.productName,
                                                )
                                                .join(", ")}
                                        </td>
                                        <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                            {formatPrice(row.netCents)}
                                        </td>
                                        <td className="py-1.5 pl-2 text-right whitespace-nowrap tabular-nums">
                                            {row.commissionCents === null
                                                ? "Not set"
                                                : `${formatPrice(row.commissionCents)} (${formatRate(row.sale.commissionBasisPoints ?? 0)})`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showVisits && figures.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Visits
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-3xl border-collapse text-sm print:min-w-0 print:text-xs">
                            <caption className="sr-only">{`Visits for ${artistName}, ${periodLabel}`}</caption>
                            <thead>
                                <tr className="border-b-2 border-border text-xs uppercase tracking-wide text-muted-foreground">
                                    <th scope="col" className="py-2 pr-2 text-left font-medium">
                                        Date
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-left font-medium">
                                        Client
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-left font-medium">
                                        Services
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">
                                        Price
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">
                                        Discount
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">
                                        Sales
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">
                                        Commission
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-right font-medium">
                                        Fees
                                    </th>
                                    <th scope="col" className="py-2 pl-2 text-left font-medium">
                                        Paid by
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {figures.map((row) => (
                                    <tr
                                        key={row.visit.id}
                                        className="break-inside-avoid border-b border-border/15 align-top"
                                    >
                                        <td className="py-1.5 pr-2 whitespace-nowrap">
                                            {visitWhen(row.visit.startTime)}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {row.visit.clientName ?? "—"}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            {row.visit.lines
                                                .map((line) => line.serviceName)
                                                .join(", ")}
                                        </td>
                                        <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                            {formatPrice(row.grossCents)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                            {row.discountCents === 0
                                                ? "—"
                                                : `−${formatPrice(row.discountCents)}`}
                                        </td>
                                        <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                            {formatPrice(row.salesCents)}
                                        </td>
                                        <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                            {row.commissionCents === null
                                                ? "Not set"
                                                : `${formatPrice(row.commissionCents)} (${formatRate(row.visit.commissionBasisPoints ?? 0)})`}
                                        </td>
                                        <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                            {row.serviceFeeCents === 0
                                                ? "—"
                                                : `−${formatPrice(row.serviceFeeCents)}`}
                                        </td>
                                        <td className="py-1.5 pl-2">{paidBy(row.visit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-6 flex flex-col gap-1.5 text-xs text-muted-foreground print:mt-4 print:gap-1">
                <p>
                    Total sales are what clients paid for services after discounts, including
                    anything paid with store credit, a gift card or Groupon (at face value).
                    Commission is worked out per visit and rounded to the cent. Service fees are a
                    fixed amount per service, charged to the artist. Take-home is commission minus
                    service fees{hasRetail ? ", plus retail commission" : ""}.
                    {hasRetail &&
                        " Retail sales are products sold, after discounts and before sales tax; retail commission is at the artist's separate retail rate."}
                </p>
                {summary.retailSalesWithoutRate > 0 && (
                    <p className="font-medium text-danger">
                        {`No retail commission rate was set when ${plural(summary.retailSalesWithoutRate, "retail sale")} in this period ${summary.retailSalesWithoutRate === 1 ? "was" : "were"} made, so take-home can't be worked out yet. `}
                        <Link href="/admin/artists" className="underline print:no-underline">
                            Set the retail rate on the Artists page
                        </Link>
                        {" and those sales will use it."}
                    </p>
                )}
                {summary.visitsWithoutRate > 0 && (
                    <p className="font-medium text-danger">
                        {`No commission rate was set when ${plural(summary.visitsWithoutRate, "visit")} in this period ${summary.visitsWithoutRate === 1 ? "was" : "were"} checked out, so commission and take-home can't be worked out yet. `}
                        <Link href="/admin/artists" className="underline print:no-underline">
                            Set the rate on the Artists page
                        </Link>
                        {" and those visits will use it."}
                    </p>
                )}
                {summary.backfilledRateVisits > 0 && (
                    <p>
                        {`${plural(summary.backfilledRateVisits, "visit")} ${summary.backfilledRateVisits === 1 ? "was" : "were"} checked out before a commission rate was set, and ${summary.backfilledRateVisits === 1 ? "uses" : "use"} the rate saved afterwards.`}
                    </p>
                )}
                {summary.backfilledPriceVisits > 0 && (
                    <p>
                        {`${plural(summary.backfilledPriceVisits, "visit")} ${summary.backfilledPriceVisits === 1 ? "was" : "were"} booked before ${formatSalonDate(LINE_PRICES_RECORDED_FROM, { month: "short", day: "numeric", year: "numeric" })}, before each booking recorded its own prices; ${summary.backfilledPriceVisits === 1 ? "its price is" : "their prices are"} the service prices as of that date and may differ slightly from what was charged.`}
                    </p>
                )}
                <p>
                    {`Generated ${formatSalonDateTime(generatedAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}. Figures are calculated from checked-out visits each time, so they change if a visit in this period is edited.`}
                </p>
            </div>
        </section>
    )
}
