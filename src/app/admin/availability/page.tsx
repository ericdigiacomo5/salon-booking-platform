import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ArtistSelector } from "@/components/admin/availability/artist-selector"
import { AdminAvailabilityManager } from "@/components/admin/availability/admin-availability-manager"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Availability" }

export default async function AdminAvailabilityPage({
    searchParams,
}: {
    searchParams: Promise<{ artistId?: string }>
}) {
    await requireAdminPage("/admin/availability")

    const params = await searchParams
    const artists = await prisma.artist.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
    })

    if (!params.artistId && artists.length > 0) {
        redirect(`/admin/availability?artistId=${artists[0].id}`)
    }

    const selectedArtistId = params.artistId ?? null

    const windows = selectedArtistId
        ? await prisma.availability.findMany({
              where: { artistId: selectedArtistId },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          })
        : []

    return (
        <div>
            <ArtistSelector artists={artists} currentArtistId={selectedArtistId ?? ""} />
            {selectedArtistId ? (
                <AdminAvailabilityManager artistId={selectedArtistId} initialWindows={windows} />
            ) : (
                <p className="mt-8 text-muted-foreground">No artists yet — add one first.</p>
            )}
        </div>
    )
}
