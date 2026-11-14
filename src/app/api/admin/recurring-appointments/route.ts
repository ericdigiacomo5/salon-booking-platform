import { NextRequest, after } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { RecurringStatus, type Prisma } from "@/generated/prisma/client"
import { SAFE_USER_SELECT_BASIC } from "@/lib/user-select"
import { loadServicesToBook, materializeSeries, upcomingSkipsInclude } from "@/lib/booking"
import {
    parseServiceIds,
    SERVICE_LINES_INCLUDE,
    servicesFitOneAppointment,
} from "@/lib/appointment-services"
import { sendRecurringConfirmation } from "@/lib/appointment-emails"
import { isGridAligned, isValidTimeString } from "@/lib/availability"
import { maxSeriesEnd } from "@/lib/recurring"
import { parseLocalDate } from "@/lib/format"
import { salonWeekday } from "@/lib/salon-time"
import { getPolicySettings } from "@/lib/settings"
import { readJsonObject } from "@/lib/request"

export async function GET(request: NextRequest) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const userId = request.nextUrl.searchParams.get("userId")
    const status = request.nextUrl.searchParams.get("status")

    const where: Prisma.RecurringAppointmentWhereInput = {}
    if (userId) where.userId = userId

    if (status) {
        if (!(Object.values(RecurringStatus) as string[]).includes(status)) {
            return Response.json({ error: "Status is invalid" }, { status: 400 })
        }
        where.status = status as RecurringStatus
    }

    const recurringAppointments = await prisma.recurringAppointment.findMany({
        where,
        include: {
            artist: true,
            ...SERVICE_LINES_INCLUDE,
            user: { select: SAFE_USER_SELECT_BASIC },
            ...upcomingSkipsInclude(),
        },
        orderBy: { createdAt: "desc" },
    })

    return Response.json({ data: recurringAppointments })
}

export async function POST(request: Request) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const {
        artistId,
        serviceIds: requestedServiceIds,
        dayOfWeek,
        startTime,
        intervalWeeks,
        seriesStart,
        seriesEnd,
        userId,
    } = body

    if (typeof userId !== "string" || !userId) {
        return Response.json({ error: "Customer is required" }, { status: 400 })
    }

    if (!artistId || typeof artistId !== "string") {
        return Response.json({ error: "Artist is required" }, { status: 400 })
    }

    const serviceIds = parseServiceIds(requestedServiceIds)
    if (typeof serviceIds === "string") {
        return Response.json({ error: serviceIds }, { status: 400 })
    }

    if (
        typeof dayOfWeek !== "number" ||
        !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 ||
        dayOfWeek > 6
    ) {
        return Response.json({ error: "Day of week must be an integer 0-6" }, { status: 400 })
    }

    if (
        typeof startTime !== "string" ||
        !isValidTimeString(startTime) ||
        !isGridAligned(startTime)
    ) {
        return Response.json(
            { error: "Start time must be a valid HH:mm time on a 15-minute boundary" },
            { status: 400 },
        )
    }

    if (
        typeof intervalWeeks !== "number" ||
        !Number.isInteger(intervalWeeks) ||
        intervalWeeks < 1
    ) {
        return Response.json(
            { error: "Interval must be a positive integer number of weeks" },
            { status: 400 },
        )
    }

    if (typeof seriesStart !== "string") {
        return Response.json({ error: "Series start date is required" }, { status: 400 })
    }

    const parsedSeriesStart = parseLocalDate(seriesStart)
    if (!parsedSeriesStart) {
        return Response.json({ error: "Series start date is invalid" }, { status: 400 })
    }

    if (salonWeekday(parsedSeriesStart) !== dayOfWeek) {
        return Response.json(
            { error: "Series start date does not fall on the given day of week" },
            { status: 400 },
        )
    }

    if (typeof seriesEnd !== "string" || !seriesEnd) {
        return Response.json({ error: "Series end date is required" }, { status: 400 })
    }

    const parsedSeriesEnd = parseLocalDate(seriesEnd)
    if (!parsedSeriesEnd) {
        return Response.json({ error: "Series end date is invalid" }, { status: 400 })
    }

    if (parsedSeriesEnd.getTime() < parsedSeriesStart.getTime()) {
        return Response.json(
            { error: "Series end date must be on or after the series start date" },
            { status: 400 },
        )
    }

    const { maxSeriesWeeks } = await getPolicySettings()
    if (parsedSeriesEnd.getTime() > maxSeriesEnd(parsedSeriesStart, maxSeriesWeeks).getTime()) {
        return Response.json(
            { error: `A standing appointment can run for at most ${maxSeriesWeeks} weeks` },
            { status: 400 },
        )
    }

    const [artist, services, targetUser] = await Promise.all([
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

    if (!servicesFitOneAppointment(services)) {
        return Response.json(
            { error: "Those services are too long for one appointment" },
            { status: 400 },
        )
    }

    if (!targetUser) {
        return Response.json({ error: "User not found" }, { status: 404 })
    }

    const recurringAppointment = await prisma.recurringAppointment.create({
        data: {
            userId,
            artistId,
            dayOfWeek,
            startTime,
            intervalWeeks,
            seriesStart: parsedSeriesStart,
            seriesEnd: parsedSeriesEnd,
            services: {
                create: serviceIds.map((serviceId, position) => ({ serviceId, position })),
            },
        },
    })

    const materialization = await materializeSeries(recurringAppointment.id, { allowPast: true })

    const created = await prisma.appointment.findMany({
        where: { id: { in: materialization.created.map((c) => c.appointmentId) } },
        include: SERVICE_LINES_INCLUDE,
        orderBy: { startTime: "asc" },
    })
    const skipped = materialization.skipped.map((s) => ({
        date: s.occurrenceDate,
        reason: s.reason,
    }))

    const createdIds = created.map((a) => a.id)
    const skippedStartTimes = materialization.skipped.map((s) => s.startTime)
    after(() => sendRecurringConfirmation(recurringAppointment.id, createdIds, skippedStartTimes))

    return Response.json({ data: { recurringAppointment, created, skipped } }, { status: 201 })
}
