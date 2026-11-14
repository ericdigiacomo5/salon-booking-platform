import { formatPrice } from "@/lib/format"
import { formatShare } from "@/lib/pay-report"
import type { ProductSalesRow } from "@/lib/retail-report"

const NUM = "px-2 py-1.5 text-right tabular-nums print:py-1"

export function ProductSalesTable({ rows, caption }: { rows: ProductSalesRow[]; caption: string }) {
    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">No products sold in this period.</p>
    }

    const units = rows.reduce((sum, row) => sum + row.unitCount, 0)
    const net = rows.reduce((sum, row) => sum + row.netCents, 0)

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-md border-collapse text-sm print:min-w-0 print:text-xs">
                <caption className="sr-only">{caption}</caption>
                <thead>
                    <tr className="border-b-2 border-border text-xs uppercase tracking-wide text-muted-foreground">
                        <th scope="col" className="py-2 pr-2 text-left font-medium">
                            Product
                        </th>
                        <th scope="col" className="px-2 py-2 text-right font-medium">
                            Units
                        </th>
                        <th scope="col" className="px-2 py-2 text-right font-medium">
                            Sales (before tax)
                        </th>
                        <th scope="col" className="px-2 py-2 text-right font-medium">
                            % of retail
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.productId} className="border-b border-border/15">
                            <th
                                scope="row"
                                className="py-1.5 pr-2 text-left font-normal print:py-1"
                            >
                                {row.productName}
                            </th>
                            <td className={NUM}>{row.unitCount}</td>
                            <td className={NUM}>{formatPrice(row.netCents)}</td>
                            <td className={NUM}>{formatShare(row.shareOfSales)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                        <th scope="row" className="py-1.5 pr-2 text-left">
                            Total
                        </th>
                        <td className={NUM}>{units}</td>
                        <td className={NUM}>{formatPrice(net)}</td>
                        <td className={NUM}>{formatShare(net === 0 ? null : 1)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}
