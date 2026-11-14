import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ArtistSelector } from "@/components/admin/availability/artist-selector"
import { AdminTimeOffManager } from "@/components/admin/time-off/admin-time-off-manager"
import { SALON_WIDE_VALUE } from "@/lib/time-off"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Time Off" }

export default async function AdminTimeOffPage({
    searchParams,
}: {
    searchParams: Promise<{ artistId?: string }>
}) {
    await requireAdminPage("/admin/time-off")

    const params = await searchParams
    const artists = await prisma.artist.findMany({
        where: { active: true },
        orderBy: { createdAt: "asc" },
    })

    if (!params.artistId && artists.length > 0) {
        redirect(`/admin/time-off?artistId=${artists[0].id}`)
    }

    const selectedArtistId = params.artistId ?? null
    const isSalonWide = selectedArtistId === SALON_WIDE_VALUE

    const entries = selectedArtistId
        ? await prisma.timeOff.findMany({
              where: { artistId: isSalonWide ? null : selectedArtistId },
              orderBy: [{ date: "asc" }, { startTime: "asc" }],
          })
        : []

    return (
        <div>
            <ArtistSelector
                artists={artists}
                currentArtistId={selectedArtistId ?? ""}
                allowSalonWide
            />
            {selectedArtistId ? (
                <AdminTimeOffManager
                    artistId={isSalonWide ? null : selectedArtistId}
                    initialEntries={entries}
                />
            ) : (
                <p className="mt-8 text-muted-foreground">No artists yet — add one first.</p>
            )}
        </div>
    )
}
