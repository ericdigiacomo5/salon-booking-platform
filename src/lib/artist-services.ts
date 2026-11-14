export const ARTIST_SERVICES_INCLUDE = {
    services: { select: { serviceId: true } },
} as const

export function offeredServiceIdsOf(artist: { services: { serviceId: string }[] }): string[] {
    return artist.services.map((row) => row.serviceId)
}

export function servicesNotOffered(
    offered: readonly string[],
    serviceIds: readonly string[],
): string[] {
    if (offered.length === 0) return []
    const set = new Set(offered)
    return serviceIds.filter((id) => !set.has(id))
}

export function artistOffersAll(
    offered: readonly string[],
    serviceIds: readonly string[],
): boolean {
    return servicesNotOffered(offered, serviceIds).length === 0
}

export function joinNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? ""
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}
