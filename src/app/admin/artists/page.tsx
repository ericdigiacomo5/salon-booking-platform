import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { ARTIST_PAY_TERMS_INCLUDE } from "@/lib/pay-terms"
import { AdminArtistsManager } from "@/components/admin/artists/admin-artists-manager"
import { requireAdminPage } from "@/lib/require-admin-page"
import { ARTIST_SERVICES_INCLUDE } from "@/lib/artist-services"

export const metadata: Metadata = { title: "Admin: Artists" }

export default async function AdminArtistsPage() {
    await requireAdminPage("/admin/artists")

    const [artists, services] = await Promise.all([
        prisma.artist.findMany({
            include: { portfolio: true, ...ARTIST_PAY_TERMS_INCLUDE, ...ARTIST_SERVICES_INCLUDE },
            orderBy: { createdAt: "asc" },
        }),
        prisma.service.findMany({
            select: { id: true, name: true, active: true },
            orderBy: [{ active: "desc" }, { createdAt: "asc" }],
        }),
    ])

    return <AdminArtistsManager initialArtists={artists} services={services} />
}
