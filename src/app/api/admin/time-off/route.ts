import { requireAdmin } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { prisma } from "@/lib/prisma"
import {
    isValidTimeString,
    isGridAligned,
    startOfDay,
    endOfDay,
    timeOffDateRangeOverlap,
} from "@/lib/availability"
import { parseLocalDate } from "@/lib/format"
import { after } from "next/server"
import { conflictsResponse, parseApprovedIds, saveTimeOffChecked } from "@/lib/time-off-conflicts"
import { sendCancellationNotice } from "@/lib/appointment-emails"

export async function POST(request: Request) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { artistId, date, endDate, startTime, endTime } = body

    const approvedIds = parseApprovedIds(body.cancelConflictingAppointmentIds)
    if (approvedIds === null) {
        return Response.json(
            { error: "Appointments to cancel must be a list of ids" },
            { status: 400 },
        )
    }

    if (artistId !== undefined && artistId !== null && typeof artistId !== "string") {
        return Response.json({ error: "Artist is invalid" }, { status: 400 })
    }

    const targetArtistId = typeof artistId === "string" && artistId ? artistId : null

    if (targetArtistId) {
        const artist = await prisma.artist.findUnique({
            where: { id: targetArtistId },
        })

        if (!artist) {
            return Response.json({ error: "Artist not found" }, { status: 404 })
        }
    }

    if (typeof date !== "string") {
        return Response.json({ error: "Date is required" }, { status: 400 })
    }

    const parsedDate = parseLocalDate(date)

    if (!parsedDate) {
        return Response.json({ error: "Date is invalid" }, { status: 400 })
    }

    let parsedEndDate: Date | null = null
    if (endDate !== undefined && endDate !== null) {
        if (typeof endDate !== "string") {
            return Response.json({ error: "End date is invalid" }, { status: 400 })
        }

        const parsed = parseLocalDate(endDate)
        if (!parsed) {
            return Response.json({ error: "End date is invalid" }, { status: 400 })
        }

        if (parsed.getTime() < parsedDate.getTime()) {
            return Response.json(
                { error: "End date must be on or after the start date" },
                { status: 400 },
            )
        }

        parsedEndDate = parsed
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

    if (typeof endTime !== "string" || !isValidTimeString(endTime) || !isGridAligned(endTime)) {
        return Response.json(
            { error: "End time must be a valid HH:mm time on a 15-minute boundary" },
            { status: 400 },
        )
    }

    if (startTime >= endTime) {
        return Response.json({ error: "Start time must be before end time" }, { status: 400 })
    }

    const dayStart = startOfDay(parsedDate)
    const dayEnd = endOfDay(parsedEndDate ?? parsedDate)

    const priorTimeOff = await prisma.timeOff.findMany({
        where: {
            AND: [
                targetArtistId ? { OR: [{ artistId: targetArtistId }, { artistId: null }] } : {},
                timeOffDateRangeOverlap(dayStart, dayEnd),
            ],
        },
    })

    const isOverlapping = priorTimeOff.some((t) => {
        return t.startTime < endTime && startTime < t.endTime
    })

    if (isOverlapping) {
        return Response.json({ error: "Time off is overlapping" }, { status: 400 })
    }

    const result = await saveTimeOffChecked(
        { artistId: targetArtistId, date: parsedDate, endDate: parsedEndDate, startTime, endTime },
        approvedIds,
        (tx) =>
            tx.timeOff.create({
                data: {
                    artistId: targetArtistId,
                    date: parsedDate,
                    endDate: parsedEndDate,
                    startTime: startTime,
                    endTime: endTime,
                },
            }),
    )

    if (!result.ok) return conflictsResponse(result.conflicts)

    for (const id of result.cancelledIds) {
        after(() => sendCancellationNotice(id, "salon"))
    }

    return Response.json(
        { data: { ...result.timeOff, cancelledAppointmentIds: result.cancelledIds } },
        { status: 201 },
    )
}
