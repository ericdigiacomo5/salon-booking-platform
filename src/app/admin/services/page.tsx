import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { SERVICE_PAY_TERMS_INCLUDE } from "@/lib/pay-terms"
import { AdminServicesManager } from "@/components/admin/services/admin-services-manager"
import { requireAdminPage } from "@/lib/require-admin-page"
import { CATEGORY_ORDER } from "@/lib/service-category"

export const metadata: Metadata = { title: "Admin: Services" }

export default async function AdminServicesPage() {
    await requireAdminPage("/admin/services")

    const [services, categories] = await Promise.all([
        prisma.service.findMany({
            include: SERVICE_PAY_TERMS_INCLUDE,
            orderBy: { createdAt: "asc" },
        }),
        prisma.serviceCategory.findMany({ orderBy: CATEGORY_ORDER }),
    ])

    return <AdminServicesManager initialServices={services} initialCategories={categories} />
}
