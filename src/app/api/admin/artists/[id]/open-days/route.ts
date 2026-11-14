import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { getOpenDays } from "@/lib/availability"
import { MAX_APPOINTMENT_MINUTES } from "@/lib/schedule-grid"
import { ADMIN_DAYS_AHEAD } from "@/lib/recurring"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id: artistId } = await params
    const search = request.nextUrl.searchParams

    const durationMinutes = Number(search.get("durationMinutes"))
    if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > MAX_APPOINTMENT_MINUTES
    ) {
        return Response.json({ error: "Duration is invalid" }, { status: 400 })
    }

    const days = Number(search.get("days") ?? ADMIN_DAYS_AHEAD)
    if (!Number.isInteger(days) || days < 1 || days > ADMIN_DAYS_AHEAD) {
        return Response.json({ error: `Days must be 1 to ${ADMIN_DAYS_AHEAD}` }, { status: 400 })
    }

    const artist = await prisma.artist.findUnique({
        where: { id: artistId },
        select: { id: true, active: true },
    })
    if (!artist || !artist.active) {
        return Response.json({ error: "Artist not found" }, { status: 404 })
    }

    const excludeAppointmentId = search.get("excludeAppointmentId") || undefined
    const openDays = await getOpenDays(artist.id, new Date(), days, durationMinutes, {
        excludeAppointmentId,
    })

    return Response.json({
        data: openDays.map((day) => ({
            date: day.dateKey,
            firstStart: day.firstStart.toISOString(),
        })),
    })
}
