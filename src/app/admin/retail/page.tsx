import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { RetailSaleManager } from "@/components/admin/retail/retail-sale-manager"
import { RETAIL_SALE_INCLUDE } from "@/lib/retail-data"
import { getRetailTaxRate } from "@/lib/settings"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Retail Sale" }

const RECENT_SALES = 50

export default async function AdminRetailPage() {
    await requireAdminPage("/admin/retail")

    const [products, artists, taxRateMillipercent, recentSales] = await Promise.all([
        prisma.product.findMany({
            where: { active: true },
            select: { id: true, name: true, priceCents: true },
            orderBy: { name: "asc" },
        }),
        prisma.artist.findMany({
            where: { active: true },
            select: { id: true, name: true },
            orderBy: { createdAt: "asc" },
        }),
        getRetailTaxRate(),
        prisma.retailSale.findMany({
            include: RETAIL_SALE_INCLUDE,
            orderBy: { createdAt: "desc" },
            take: RECENT_SALES,
        }),
    ])

    return (
        <RetailSaleManager
            products={products}
            artists={artists}
            taxRateMillipercent={taxRateMillipercent}
            initialSales={recentSales}
        />
    )
}
