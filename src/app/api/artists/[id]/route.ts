import { prisma } from "@/lib/prisma"
import { PUBLIC_ARTIST_SELECT, PUBLIC_PORTFOLIO_IMAGE_SELECT } from "@/lib/public-select"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const artist = await prisma.artist.findFirst({
        where: { id, active: true },
        select: { ...PUBLIC_ARTIST_SELECT, portfolio: { select: PUBLIC_PORTFOLIO_IMAGE_SELECT } },
    })

    if (!artist) {
        return Response.json({ error: "Artist not found" }, { status: 404 })
    }

    return Response.json({ data: artist })
}
