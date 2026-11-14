import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PrintButton } from "@/components/admin/reports/print-button"
import { ProductSalesTable } from "@/components/admin/reports/product-sales-table"
import { PAYMENT_METHOD_LABEL } from "@/components/admin/appointment-shared"
import { buttonVariants } from "@/components/ui/button"
import { formatPrice, parseLocalDate, toLocalDateKey } from "@/lib/format"
import {
    DEFAULT_REPORT_DAYS,
    formatDateRange,
    formatRate,
    rangeError,
    reportPresets,
} from "@/lib/pay-report"
import { addDays } from "@/lib/recurring"
import { loadRetailReportSales } from "@/lib/retail-data"
import { formatTaxRate } from "@/lib/retail"
import {
    retailSaleFigures,
    retailSummary,
    salesByProduct,
    taxByRate,
    type RetailSaleFigures,
} from "@/lib/retail-report"
import { endOfDay, startOfDay } from "@/lib/schedule-grid"
import { formatSalonDate, formatSalonTime } from "@/lib/salon-time"
import { requireAdminPage } from "@/lib/require-admin-page"
import { RetailSaleStatus } from "@/generated/prisma/client"

export const metadata: Metadata = { title: "Admin: Retail & Tax Report" }

const FIELD =
    "mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground"
const NUM = "px-2 py-1.5 text-right tabular-nums"

function money(cents: number | null): string {
    return cents === null ? "Unknown" : formatPrice(cents)
}

export default async function RetailReportPage({
    searchParams,
}: {
    searchParams: Promise<{ from?: string; to?: string }>
}) {
    await requireAdminPage("/admin/reports/retail")

    const params = await searchParams
    const today = startOfDay(new Date())
    const from = params.from ? parseLocalDate(params.from) : null
    const to = params.to ? parseLocalDate(params.to) : null
    if (!from || !to) {
        const query = new URLSearchParams({
            from: toLocalDateKey(from ?? addDays(today, -(DEFAULT_REPORT_DAYS - 1))),
            to: toLocalDateKey(to ?? today),
        })
        redirect(`/admin/reports/retail?${query.toString()}`)
    }

    const error = rangeError(from, to)
    const periodLabel = formatDateRange(from, to)
    const range = { gte: startOfDay(from), lte: endOfDay(to) }

    const [figures, artists, voidedCount] = error
        ? [[], [], 0]
        : await Promise.all([
              loadRetailReportSales({ from: range.gte, to: range.lte, artistId: "all" }).then(
                  (rows) => rows.map(retailSaleFigures),
              ),
              prisma.artist.findMany({
                  select: { id: true, name: true },
                  orderBy: [{ active: "desc" }, { createdAt: "asc" }],
              }),
              prisma.retailSale.count({
                  where: { status: RetailSaleStatus.VOIDED, soldAt: range },
              }),
          ])

    const summary = retailSummary(figures)
    const byArtist: { key: string; name: string; rows: RetailSaleFigures[] }[] = [
        ...artists.map((artist) => ({
            key: artist.id,
            name: artist.name,
            rows: figures.filter((row) => row.sale.artistId === artist.id),
        })),
        {
            key: "house",
            name: "House (no artist)",
            rows: figures.filter((row) => row.sale.artistId === null),
        },
    ].filter((group) => group.rows.length > 0)

    return (
        <div className="flex flex-col gap-6">
            <div className="print:hidden">
                <h2 className="text-lg font-semibold text-foreground">Retail Sales &amp; Tax</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {
                        "Products sold in the dates chosen, by the day of the sale (a sale at a visit's checkout counts on the visit's day). Ring up a sale on the "
                    }
                    <Link href="/admin/retail" className="underline">
                        Retail Sale
                    </Link>
                    {" page; artists' retail commission is also on the "}
                    <Link href="/admin/reports/pay" className="underline">
                        Pay Report
                    </Link>
                    .
                </p>
            </div>

            <div className="rounded-lg border border-line bg-surface p-4 shadow-sm print:hidden">
                <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <div>
                        <label
                            htmlFor="retail-from"
                            className="block text-xs font-medium text-muted-foreground"
                        >
                            From
                        </label>
                        <input
                            id="retail-from"
                            type="date"
                            name="from"
                            required
                            defaultValue={toLocalDateKey(from)}
                            className={FIELD}
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="retail-to"
                            className="block text-xs font-medium text-muted-foreground"
                        >
                            To
                        </label>
                        <input
                            id="retail-to"
                            type="date"
                            name="to"
                            required
                            defaultValue={toLocalDateKey(to)}
                            className={FIELD}
                        />
                    </div>
                    <button type="submit" className={buttonVariants({ size: "md" })}>
                        Show
                    </button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                    {reportPresets(today).map((preset) => (
                        <Link
                            key={preset.label}
                            href={`/admin/reports/retail?from=${toLocalDateKey(preset.from)}&to=${toLocalDateKey(preset.to)}`}
                            className={buttonVariants({ variant: "secondary", size: "md" })}
                        >
                            {preset.label}
                        </Link>
                    ))}
                </div>
            </div>

            {error ? (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            ) : (
                <section className="rounded-lg border border-line bg-surface p-4 shadow-sm sm:p-6 print:border-0 print:p-0 print:shadow-none">
                    <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-border pb-3">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                Retail sales &amp; tax
                            </p>
                            <h3 className="font-serif text-2xl font-semibold text-foreground">
                                {periodLabel}
                            </h3>
                        </div>
                        {figures.length > 0 && <PrintButton label="Print" />}
                    </div>

                    {figures.length === 0 ? (
                        <p className="mt-4 text-muted-foreground">{`No retail sales in ${periodLabel}.`}</p>
                    ) : (
                        <>
                            <dl className="mt-4 grid gap-x-8 text-sm sm:grid-cols-2">
                                {[
                                    ["Sales", `${summary.saleCount} · ${summary.unitCount} units`],
                                    ["Before discounts", formatPrice(summary.grossCents)],
                                    [
                                        "Discounts",
                                        summary.discountCents === 0
                                            ? formatPrice(0)
                                            : `−${formatPrice(summary.discountCents)}`,
                                    ],
                                    ["Taxable sales", formatPrice(summary.netCents)],
                                    ["Sales tax collected", formatPrice(summary.taxCents)],
                                    ["Total collected", formatPrice(summary.totalCents)],
                                    ["Retail commission", money(summary.commissionCents)],
                                ].map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="flex items-baseline justify-between gap-4 border-b border-border/15 py-1.5"
                                    >
                                        <dt>{label}</dt>
                                        <dd className="text-right font-medium tabular-nums">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>

                            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Sales tax by rate
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-md border-collapse text-sm">
                                    <caption className="sr-only">{`Sales tax by rate, ${periodLabel}`}</caption>
                                    <thead>
                                        <tr className="border-b-2 border-border text-xs uppercase tracking-wide text-muted-foreground">
                                            <th
                                                scope="col"
                                                className="py-2 pr-2 text-left font-medium"
                                            >
                                                Rate
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Sales
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Taxable sales
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Tax collected
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {taxByRate(figures).map((row) => (
                                            <tr
                                                key={row.taxRateMillipercent}
                                                className="border-b border-border/15"
                                            >
                                                <th
                                                    scope="row"
                                                    className="py-1.5 pr-2 text-left font-normal"
                                                >
                                                    {formatTaxRate(row.taxRateMillipercent)}
                                                </th>
                                                <td className={NUM}>{row.saleCount}</td>
                                                <td className={NUM}>{formatPrice(row.netCents)}</td>
                                                <td className={NUM}>{formatPrice(row.taxCents)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                By artist
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-lg border-collapse text-sm">
                                    <caption className="sr-only">{`Retail sales by artist, ${periodLabel}`}</caption>
                                    <thead>
                                        <tr className="border-b-2 border-border text-xs uppercase tracking-wide text-muted-foreground">
                                            <th
                                                scope="col"
                                                className="py-2 pr-2 text-left font-medium"
                                            >
                                                Sold by
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Sales
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Retail sales
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Rate
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Commission
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {byArtist.map((group) => {
                                            const totals = retailSummary(group.rows)
                                            return (
                                                <tr
                                                    key={group.key}
                                                    className="border-b border-border/15"
                                                >
                                                    <th
                                                        scope="row"
                                                        className="py-1.5 pr-2 text-left font-normal"
                                                    >
                                                        {group.name}
                                                    </th>
                                                    <td className={NUM}>{totals.saleCount}</td>
                                                    <td className={NUM}>
                                                        {formatPrice(totals.netCents)}
                                                    </td>
                                                    <td className={NUM}>
                                                        {group.key === "house"
                                                            ? "—"
                                                            : totals.ratesBasisPoints.length === 0
                                                              ? "Not set"
                                                              : totals.ratesBasisPoints
                                                                    .map(formatRate)
                                                                    .join(" / ")}
                                                    </td>
                                                    <td className={NUM}>
                                                        {money(totals.commissionCents)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                By product
                            </h4>
                            <ProductSalesTable
                                rows={salesByProduct(figures)}
                                caption={`Retail sales by product, ${periodLabel}`}
                            />

                            <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Every sale
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-3xl border-collapse text-sm print:min-w-0 print:text-xs">
                                    <caption className="sr-only">{`Retail sales, ${periodLabel}`}</caption>
                                    <thead>
                                        <tr className="border-b-2 border-border text-xs uppercase tracking-wide text-muted-foreground">
                                            <th
                                                scope="col"
                                                className="py-2 pr-2 text-left font-medium"
                                            >
                                                Date
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-left font-medium"
                                            >
                                                Products
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-left font-medium"
                                            >
                                                Sold by
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Taxable
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Tax
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-2 py-2 text-right font-medium"
                                            >
                                                Total
                                            </th>
                                            <th
                                                scope="col"
                                                className="py-2 pl-2 text-left font-medium"
                                            >
                                                Paid by
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {figures.map((row) => (
                                            <tr
                                                key={row.sale.id}
                                                className="break-inside-avoid border-b border-border/15 align-top"
                                            >
                                                <td className="py-1.5 pr-2 whitespace-nowrap">
                                                    {`${formatSalonDate(row.sale.soldAt, { month: "short", day: "numeric" })}, ${formatSalonTime(row.sale.soldAt)}`}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {row.sale.items
                                                        .map((item) =>
                                                            item.quantity > 1
                                                                ? `${item.productName} ×${item.quantity}`
                                                                : item.productName,
                                                        )
                                                        .join(", ")}
                                                    {row.sale.appointmentId && (
                                                        <span className="text-muted-foreground">
                                                            {" (at checkout)"}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {artists.find((a) => a.id === row.sale.artistId)
                                                        ?.name ?? "House"}
                                                </td>
                                                <td className={NUM}>{formatPrice(row.netCents)}</td>
                                                <td className={NUM}>{formatPrice(row.taxCents)}</td>
                                                <td className={NUM}>
                                                    {formatPrice(row.totalCents)}
                                                </td>
                                                <td className="py-1.5 pl-2">
                                                    {[
                                                        row.sale.paymentMethod &&
                                                            PAYMENT_METHOD_LABEL[
                                                                row.sale.paymentMethod
                                                            ],
                                                        row.sale.creditAppliedCents > 0 &&
                                                            "store credit",
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" + ") || "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    <div className="mt-6 flex flex-col gap-1 text-xs text-muted-foreground">
                        <p>
                            Taxable sales are products after discounts, before tax. Sales tax is
                            what was charged at the rate in effect when each sale was made. Total
                            collected includes tax and anything paid with store credit or a gift
                            card. Services aren&apos;t taxed and aren&apos;t included here.
                        </p>
                        {voidedCount > 0 && (
                            <p>
                                {`${voidedCount} voided ${voidedCount === 1 ? "sale is" : "sales are"} left out of these totals (see the Retail Sale page).`}
                            </p>
                        )}
                        {summary.salesWithoutRate > 0 && (
                            <p className="font-medium text-danger">
                                {`${summary.salesWithoutRate} sale${summary.salesWithoutRate === 1 ? " was" : "s were"} made by an artist with no retail commission rate, so retail commission can't be worked out yet. Set it on the Artists page.`}
                            </p>
                        )}
                    </div>
                </section>
            )}
        </div>
    )
}
