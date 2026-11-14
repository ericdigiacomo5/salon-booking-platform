import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { AppointmentStatus, Prisma } from "@/generated/prisma/client"
import { NextRequest, after } from "next/server"
import { endOfDay } from "@/lib/availability"
import { parseLocalDate } from "@/lib/format"
import { bookOccurrence, loadServicesToBook } from "@/lib/booking"
import { parseServiceIds, servicesFitOneAppointment } from "@/lib/appointment-services"
import { sendBookingConfirmation } from "@/lib/appointment-emails"
import { readJsonObject } from "@/lib/request"
import {
    isOnSlotBoundary,
    isValidAppointmentLength,
    MAX_APPOINTMENT_MINUTES,
} from "@/lib/schedule-grid"

export async function GET(request: NextRequest) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const artistId = request.nextUrl.searchParams.get("artistId")
    const status = request.nextUrl.searchParams.get("status")
    const startDate = request.nextUrl.searchParams.get("startDate")
    const endDate = request.nextUrl.searchParams.get("endDate")

    const where: Prisma.AppointmentWhereInput = {}

    if (artistId) {
        const artist = await prisma.artist.findUnique({ where: { id: artistId } })

        if (!artist) {
            return Response.json({ error: "Artist not found" }, { status: 404 })
        }

        where.artistId = artistId
    }

    if (status) {
        if (!(Object.values(AppointmentStatus) as string[]).includes(status)) {
            return Response.json({ error: "Status is invalid" }, { status: 400 })
        }

        where.status = status as AppointmentStatus
    }

    let startBound: Date | undefined
    if (startDate) {
        const parsed = parseLocalDate(startDate)

        if (!parsed) {
            return Response.json({ error: "Start date is invalid" }, { status: 400 })
        }

        startBound = parsed
    }

    let endBound: Date | undefined
    if (endDate) {
        const parsed = parseLocalDate(endDate)

        if (!parsed) {
            return Response.json({ error: "End date is invalid" }, { status: 400 })
        }

        endBound = endOfDay(parsed)
    }

    if (startBound && endBound && startBound > endBound) {
        return Response.json({ error: "Start date must be before end date" }, { status: 400 })
    }

    if (startBound || endBound) {
        where.startTime = {
            ...(startBound ? { gte: startBound } : {}),
            ...(endBound ? { lte: endBound } : {}),
        }
    }

    const appointments = await prisma.appointment.findMany({
        where,
        orderBy: { startTime: "asc" },
    })

    return Response.json({ data: appointments })
}

export async function POST(request: Request) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { artistId, serviceIds: requestedServiceIds, startTime, userId, durationMinutes } = body

    if (typeof userId !== "string" || !userId) {
        return Response.json({ error: "Customer is required" }, { status: 400 })
    }

    let lengthOverride: number | null = null
    if (durationMinutes !== undefined && durationMinutes !== null) {
        if (!isValidAppointmentLength(durationMinutes)) {
            return Response.json(
                {
                    error: `durationMinutes must be a multiple of 15, from 15 to ${MAX_APPOINTMENT_MINUTES}`,
                },
                { status: 400 },
            )
        }
        lengthOverride = durationMinutes
    }

    if (typeof artistId !== "string" || !artistId) {
        return Response.json({ error: "Artist is required" }, { status: 400 })
    }

    const serviceIds = parseServiceIds(requestedServiceIds)
    if (typeof serviceIds === "string") {
        return Response.json({ error: serviceIds }, { status: 400 })
    }

    if (typeof startTime !== "string" && typeof startTime !== "number") {
        return Response.json({ error: "Time is required" }, { status: 400 })
    }

    const parsedStartTime = new Date(startTime)
    if (isNaN(parsedStartTime.getTime()) || !isOnSlotBoundary(parsedStartTime)) {
        return Response.json({ error: "Time is invalid" }, { status: 400 })
    }

    const [artist, services, user] = await Promise.all([
        prisma.artist.findUnique({ where: { id: artistId } }),
        loadServicesToBook(serviceIds, { requireActive: true }),
        prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    ])

    if (!artist || !artist.active) {
        return Response.json({ error: "Artist not found" }, { status: 404 })
    }

    if (!services) {
        return Response.json({ error: "Service not found" }, { status: 404 })
    }

    if (lengthOverride === null && !servicesFitOneAppointment(services)) {
        return Response.json(
            { error: "Those services are too long for one appointment" },
            { status: 400 },
        )
    }

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 })
    }

    const result = await bookOccurrence({
        userId,
        artistId,
        services,
        durationMinutes: lengthOverride ?? undefined,
        startTime: parsedStartTime,
        allowPast: true,
    })

    if (!result.ok) {
        return Response.json({ error: result.error }, { status: result.status })
    }

    after(() => sendBookingConfirmation(result.appointment.id))

    return Response.json({ data: result.appointment }, { status: 201 })
}
