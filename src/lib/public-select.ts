export const PUBLIC_ARTIST_SELECT = {
    id: true,
    name: true,
    bio: true,
    photoUrl: true,
} as const

export const PUBLIC_PORTFOLIO_IMAGE_SELECT = {
    id: true,
    imageUrl: true,
    caption: true,
} as const

export const PUBLIC_SERVICE_SELECT = {
    id: true,
    name: true,
    description: true,
    categoryId: true,
    durationMinutes: true,
    priceCents: true,
} as const
