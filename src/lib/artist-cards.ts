import { prisma } from "@/lib/prisma"
import { getNextOpenings } from "@/lib/availability"
import { compareCategories } from "@/lib/service-category"
import { isCloudinaryUrl } from "@/lib/validation"

const NEXT_OPENING_DAYS = 14

export type ArtistCardData = {
    id: string
    name: string
    bio: string | null
    photoUrl: string | null
    thumbnails: { id: string; imageUrl: string; caption: string | null }[]
    specialties: string[]
    nextOpening: Date | null
}

const MAX_SPECIALTIES = 3
const THUMBNAILS = 3

export async function loadArtistCards(options: { take?: number } = {}): Promise<ArtistCardData[]> {
    const [artists, services] = await Promise.all([
        prisma.artist.findMany({
            where: { active: true },
            include: {
                services: { select: { service: { select: { name: true, active: true } } } },
                portfolio: { orderBy: { createdAt: "desc" }, take: 12 },
            },
            orderBy: { createdAt: "asc" },
            take: options.take,
        }),
        prisma.service.findMany({
            where: { active: true },
            select: {
                durationMinutes: true,
                category: { select: { name: true, position: true } },
            },
        }),
    ])

    const shortest =
        services.length > 0 ? Math.min(...services.map((s) => s.durationMinutes)) : null
    const openings = shortest
        ? await getNextOpenings(
              artists.map((a) => a.id),
              shortest,
              NEXT_OPENING_DAYS,
          )
        : {}
    const menuCategories = [
        ...new Set(
            services
                .map((s) => s.category)
                .sort(compareCategories)
                .map((category) => category.name),
        ),
    ]

    return artists.map((artist) => {
        const own = artist.services
            .filter((row) => row.service.active)
            .map((row) => row.service.name)
        const specialties =
            own.length === 0
                ? menuCategories
                : own.length > MAX_SPECIALTIES
                  ? [...own.slice(0, MAX_SPECIALTIES), `+${own.length - MAX_SPECIALTIES} more`]
                  : own

        return {
            id: artist.id,
            name: artist.name,
            bio: artist.bio,
            photoUrl: artist.photoUrl,
            thumbnails: artist.portfolio
                .filter((image) => isCloudinaryUrl(image.imageUrl))
                .slice(0, THUMBNAILS),
            specialties,
            nextOpening: openings[artist.id] ?? null,
        }
    })
}
