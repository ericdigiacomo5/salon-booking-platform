import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { AdminProductsManager } from "@/components/admin/products/admin-products-manager"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Products" }

export default async function AdminProductsPage() {
    await requireAdminPage("/admin/products")

    const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } })

    return <AdminProductsManager initialProducts={products} />
}
