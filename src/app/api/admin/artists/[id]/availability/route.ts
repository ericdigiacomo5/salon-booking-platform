import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { getOpenSlots } from "@/lib/availability"
import { parseLocalDate } from "@/lib/format"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id: artistId } = await params

    const dateString = request.nextUrl.searchParams.get("date")
    if (!dateString) {
        return Response.json({ error: "Date is required" }, { status: 400 })
    }

    const date = parseLocalDate(dateString)
    if (!date) {
        return Response.json({ error: "Date is invalid" }, { status: 400 })
    }

    const artist = await prisma.artist.findUnique({
        where: { id: artistId },
        select: { id: true, active: true },
    })

    if (!artist || !artist.active) {
        return Response.json({ error: "Artist not found" }, { status: 404 })
    }

    const excludeAppointmentId =
        request.nextUrl.searchParams.get("excludeAppointmentId") || undefined

    const openSlots = await getOpenSlots(artist.id, date, { excludeAppointmentId })

    return Response.json({ data: openSlots })
}
