import { prisma } from "@/lib/prisma"
import { PUBLIC_ARTIST_SELECT } from "@/lib/public-select"

export async function GET() {
    const artists = await prisma.artist.findMany({
        where: { active: true },
        select: PUBLIC_ARTIST_SELECT,
    })
    return Response.json({ data: artists })
}
