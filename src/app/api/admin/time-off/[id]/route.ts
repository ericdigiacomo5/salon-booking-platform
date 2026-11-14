import { requireAdmin } from "@/lib/require-admin"
import { readJsonObject, rejectCrossOrigin } from "@/lib/request"
import { prisma } from "@/lib/prisma"
import {
    isGridAligned,
    isValidTimeString,
    startOfDay,
    endOfDay,
    timeOffDateRangeOverlap,
} from "@/lib/availability"
import { parseLocalDate } from "@/lib/format"
import { Prisma } from "@/generated/prisma/client"
import { after } from "next/server"
import { conflictsResponse, parseApprovedIds, saveTimeOffChecked } from "@/lib/time-off-conflicts"
import { sendCancellationNotice } from "@/lib/appointment-emails"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id } = await params

    const timeOff = await prisma.timeOff.findUnique({
        where: { id },
    })

    if (!timeOff) {
        return Response.json({ error: "Time off not found" }, { status: 404 })
    }

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

    if (typeof artistId === "string") {
        const artist = await prisma.artist.findUnique({
            where: { id: artistId },
        })

        if (!artist) {
            return Response.json({ error: "Artist not found" }, { status: 404 })
        }
    }

    if (date !== undefined && typeof date !== "string") {
        return Response.json({ error: "Date is invalid" }, { status: 400 })
    }

    let parsedDate: Date | undefined
    if (date !== undefined) {
        const parsed = parseLocalDate(date)

        if (!parsed) {
            return Response.json({ error: "Date is invalid" }, { status: 400 })
        }

        parsedDate = parsed
    }

    let parsedEndDate: Date | null | undefined = undefined
    if (endDate !== undefined) {
        if (endDate === null) {
            parsedEndDate = null
        } else if (typeof endDate !== "string") {
            return Response.json({ error: "End date is invalid" }, { status: 400 })
        } else {
            const parsed = parseLocalDate(endDate)
            if (!parsed) {
                return Response.json({ error: "End date is invalid" }, { status: 400 })
            }
            parsedEndDate = parsed
        }
    }

    if (
        startTime !== undefined &&
        (typeof startTime !== "string" ||
            !isValidTimeString(startTime) ||
            !isGridAligned(startTime))
    ) {
        return Response.json(
            { error: "Start time must be a valid HH:mm time on a 15-minute boundary" },
            { status: 400 },
        )
    }

    if (
        endTime !== undefined &&
        (typeof endTime !== "string" || !isValidTimeString(endTime) || !isGridAligned(endTime))
    ) {
        return Response.json(
            { error: "End time must be a valid HH:mm time on a 15-minute boundary" },
            { status: 400 },
        )
    }

    const start = startTime !== undefined ? startTime : timeOff.startTime
    const end = endTime !== undefined ? endTime : timeOff.endTime
    if (start >= end) {
        return Response.json({ error: "Start time must be before end time" }, { status: 400 })
    }

    const effectiveArtistId: string | null =
        artistId !== undefined ? (artistId as string | null) : timeOff.artistId
    const effectiveDate = parsedDate !== undefined ? parsedDate : timeOff.date
    const effectiveEndDate = parsedEndDate !== undefined ? parsedEndDate : timeOff.endDate

    if (effectiveEndDate && effectiveEndDate.getTime() < effectiveDate.getTime()) {
        return Response.json(
            { error: "End date must be on or after the start date" },
            { status: 400 },
        )
    }

    const dayStart = startOfDay(effectiveDate)
    const dayEnd = endOfDay(effectiveEndDate ?? effectiveDate)

    const priorTimeOff = await prisma.timeOff.findMany({
        where: {
            AND: [
                { id: { not: timeOff.id } },
                effectiveArtistId
                    ? { OR: [{ artistId: effectiveArtistId }, { artistId: null }] }
                    : {},
                timeOffDateRangeOverlap(dayStart, dayEnd),
            ],
        },
    })

    const isOverlapping = priorTimeOff.some((t) => {
        return t.startTime < end && start < t.endTime
    })

    if (isOverlapping) {
        return Response.json({ error: "Time off is overlapping" }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (artistId !== undefined) data.artistId = artistId
    if (parsedDate !== undefined) data.date = parsedDate
    if (parsedEndDate !== undefined) data.endDate = parsedEndDate
    if (startTime !== undefined) data.startTime = startTime
    if (endTime !== undefined) data.endTime = endTime

    try {
        const result = await saveTimeOffChecked(
            {
                artistId: effectiveArtistId,
                date: effectiveDate,
                endDate: effectiveEndDate,
                startTime: start,
                endTime: end,
            },
            approvedIds,
            (tx) =>
                tx.timeOff.update({
                    where: { id: timeOff.id },
                    data: data,
                }),
        )

        if (!result.ok) return conflictsResponse(result.conflicts)

        for (const cancelledId of result.cancelledIds) {
            after(() => sendCancellationNotice(cancelledId, "salon"))
        }

        return Response.json(
            { data: { ...result.timeOff, cancelledAppointmentIds: result.cancelledIds } },
            { status: 200 },
        )
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Time off not found" }, { status: 404 })
        }

        throw error
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    const { id } = await params

    const timeOff = await prisma.timeOff.findUnique({
        where: { id },
    })

    if (!timeOff) {
        return Response.json({ error: "Time off not found" }, { status: 404 })
    }

    try {
        const deleted = await prisma.timeOff.delete({
            where: { id: timeOff.id },
        })

        return Response.json({ data: deleted }, { status: 200 })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Time off not found" }, { status: 404 })
        }

        throw error
    }
}
