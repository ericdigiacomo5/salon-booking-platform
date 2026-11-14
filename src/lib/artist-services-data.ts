import type { Prisma } from "@/generated/prisma/client"

type Tx = Prisma.TransactionClient

export function parseArtistServiceIds(value: unknown): string[] | string {
    if (value === null) return []
    if (!Array.isArray(value) || value.length > 200) return "Services must be a list of service ids"
    if (!value.every((id) => typeof id === "string" && id.length > 0))
        return "Services must be a list of service ids"
    return [...new Set(value as string[])]
}

export async function setArtistServices(
    tx: Tx,
    artistId: string,
    serviceIds: string[],
): Promise<boolean> {
    if (serviceIds.length > 0) {
        const found = await tx.service.count({ where: { id: { in: serviceIds } } })
        if (found !== serviceIds.length) return false
    }

    await tx.artistService.deleteMany({ where: { artistId } })
    if (serviceIds.length > 0) {
        await tx.artistService.createMany({
            data: serviceIds.map((serviceId) => ({ artistId, serviceId })),
        })
    }
    return true
}
