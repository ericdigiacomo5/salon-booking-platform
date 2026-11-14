import { prisma } from "@/lib/prisma"
import { AppointmentStatus, type Prisma, type TimeOff } from "@/generated/prisma/client"
import { endOfDay, startOfDay, timeStringToDate } from "@/lib/availability"
import { servicesLabel } from "@/lib/appointment-services"

type Db = Prisma.TransactionClient | typeof prisma

export type TimeOffSpan = {
    artistId: string | null
    date: Date
    endDate: Date | null
    startTime: string
    endTime: string
}

export type TimeOffConflict = {
    id: string
    startTime: string
    endTime: string
    customerName: string
    artistName: string
    services: string
}

const LIVE_STATUSES = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]

const MAX_APPROVED_IDS = 500

async function findConflictingIds(db: Db, span: TimeOffSpan): Promise<string[]> {
    const candidates = await db.appointment.findMany({
        where: {
            status: { in: LIVE_STATUSES },
            startTime: { gte: startOfDay(span.date), lte: endOfDay(span.endDate ?? span.date) },
            endTime: { gt: new Date() },
            ...(span.artistId ? { artistId: span.artistId } : {}),
        },
        select: { id: true, startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
    })

    return candidates
        .filter((appointment) => {
            const day = startOfDay(appointment.startTime)
            const blockStart = timeStringToDate(day, span.startTime)
            const blockEnd = timeStringToDate(day, span.endTime)
            return appointment.startTime < blockEnd && blockStart < appointment.endTime
        })
        .map((appointment) => appointment.id)
}

async function describeConflicts(ids: string[]): Promise<TimeOffConflict[]> {
    const rows = await prisma.appointment.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            artist: { select: { name: true } },
            user: { select: { name: true, email: true } },
            services: {
                select: { service: { select: { name: true } } },
                orderBy: { position: "asc" },
            },
        },
        orderBy: { startTime: "asc" },
    })

    return rows.map((appointment) => ({
        id: appointment.id,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
        customerName: appointment.user.name || appointment.user.email,
        artistName: appointment.artist.name,
        services: servicesLabel(appointment.services),
    }))
}

export function parseApprovedIds(value: unknown): string[] | null {
    if (value === undefined) return []
    if (!Array.isArray(value) || value.length > MAX_APPROVED_IDS) return null
    if (!value.every((id) => typeof id === "string" && id.length > 0)) return null
    return value
}

export type SaveTimeOffResult =
    | { ok: true; timeOff: TimeOff; cancelledIds: string[] }
    | { ok: false; conflicts: TimeOffConflict[] }

class UnapprovedConflictsError extends Error {
    constructor(readonly conflictIds: string[]) {
        super("Time off overlaps bookings that weren't approved for cancelling")
    }
}

export async function saveTimeOffChecked(
    span: TimeOffSpan,
    approvedIds: string[],
    write: (tx: Prisma.TransactionClient) => Promise<TimeOff>,
): Promise<SaveTimeOffResult> {
    const approved = new Set(approvedIds)

    try {
        return await prisma.$transaction(async (tx) => {
            const cancelledIds = await findConflictingIds(tx, span)
            if (cancelledIds.some((id) => !approved.has(id))) {
                throw new UnapprovedConflictsError(cancelledIds)
            }

            if (cancelledIds.length > 0) {
                await tx.appointment.updateMany({
                    where: { id: { in: cancelledIds }, status: { in: LIVE_STATUSES } },
                    data: { status: AppointmentStatus.CANCELLED },
                })
                await tx.appointmentSlot.deleteMany({
                    where: { appointmentId: { in: cancelledIds } },
                })
            }

            const timeOff = await write(tx)
            return { ok: true as const, timeOff, cancelledIds }
        })
    } catch (error) {
        if (error instanceof UnapprovedConflictsError) {
            return { ok: false, conflicts: await describeConflicts(error.conflictIds) }
        }
        throw error
    }
}

export function conflictsResponse(conflicts: TimeOffConflict[]): Response {
    const count = conflicts.length
    return Response.json(
        {
            error: `${count} booking${count === 1 ? "" : "s"} fall${count === 1 ? "s" : ""} in this time off`,
            conflicts,
        },
        { status: 409 },
    )
}
