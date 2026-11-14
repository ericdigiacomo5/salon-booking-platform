import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import {
    SLOT_MINUTES,
    getGridBounds,
    timeStringToDate,
    startOfDay,
    endOfDay,
    fittingStarts,
    type ArtistTimeOff,
    type ArtistWorkingWindow,
} from "@/lib/schedule-grid"
import { addDays } from "@/lib/recurring"
import { toLocalDateKey } from "@/lib/format"
import { salonWeekday } from "@/lib/salon-time"

export {
    SLOT_MINUTES,
    getGridBounds,
    timeStringToDate,
    startOfDay,
    endOfDay,
    type ArtistTimeOff,
    type ArtistWorkingWindow,
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function timeOffDateRangeOverlap(
    rangeStart: Date,
    rangeEnd: Date,
): Prisma.TimeOffWhereInput {
    return {
        AND: [
            { date: { lte: rangeEnd } },
            {
                OR: [
                    { endDate: null, date: { gte: rangeStart } },
                    { endDate: { gte: rangeStart } },
                ],
            },
        ],
    }
}

function generateSlotsInWindow(date: Date, startTime: string, endTime: string): Date[] {
    const slots: Date[] = []
    let current = timeStringToDate(date, startTime)
    const windowEnd = timeStringToDate(date, endTime)

    while (current < windowEnd) {
        slots.push(current)
        current = new Date(current.getTime() + SLOT_MINUTES * 60_000)
    }

    return slots
}

type WindowRow = { startTime: string; endTime: string }
type TimeOffRow = { date: Date; endDate: Date | null; startTime: string; endTime: string }

async function loadSlotInputs(
    artistId: string,
    rangeStart: Date,
    rangeEnd: Date,
    options: { dayOfWeek?: number; excludeAppointmentId?: string },
) {
    const [availability, timeOff, bookedSlots] = await Promise.all([
        prisma.availability.findMany({
            where: {
                artistId,
                ...(options.dayOfWeek !== undefined ? { dayOfWeek: options.dayOfWeek } : {}),
            },
        }),
        prisma.timeOff.findMany({
            where: {
                AND: [
                    { OR: [{ artistId }, { artistId: null }] },
                    timeOffDateRangeOverlap(rangeStart, rangeEnd),
                ],
            },
        }),
        prisma.appointmentSlot.findMany({
            where: {
                artistId,
                slotStart: { gte: rangeStart, lte: rangeEnd },
                ...(options.excludeAppointmentId
                    ? { appointmentId: { not: options.excludeAppointmentId } }
                    : {}),
            },
            select: { slotStart: true },
        }),
    ])

    return {
        availability,
        timeOff,
        bookedTimes: new Set(bookedSlots.map((slot) => slot.slotStart.getTime())),
    }
}

function timeOffAppliesOn(row: TimeOffRow, date: Date): boolean {
    return (
        row.date.getTime() <= endOfDay(date).getTime() &&
        (row.endDate ?? row.date).getTime() >= startOfDay(date).getTime()
    )
}

function computeOpenSlots(
    date: Date,
    windows: WindowRow[],
    timeOff: TimeOffRow[],
    bookedTimes: Set<number>,
    allowPast: boolean,
): Date[] {
    const timeOffRanges = timeOff.map((entry) => ({
        start: timeStringToDate(date, entry.startTime),
        end: timeStringToDate(date, entry.endTime),
    }))

    const candidateSlots = windows.flatMap((window) =>
        generateSlotsInWindow(date, window.startTime, window.endTime),
    )

    const now = Date.now()

    const openSlots = candidateSlots.filter((slot) => {
        if (!allowPast && slot.getTime() < now) return false
        if (bookedTimes.has(slot.getTime())) return false
        return !timeOffRanges.some((range) => slot >= range.start && slot < range.end)
    })

    const uniqueOpenSlots = [...new Map(openSlots.map((slot) => [slot.getTime(), slot])).values()]

    uniqueOpenSlots.sort((a, b) => a.getTime() - b.getTime())

    return uniqueOpenSlots
}

export async function getOpenSlots(
    artistId: string,
    date: Date,
    options?: { allowPast?: boolean; excludeAppointmentId?: string },
): Promise<Date[]> {
    const { availability, timeOff, bookedTimes } = await loadSlotInputs(
        artistId,
        startOfDay(date),
        endOfDay(date),
        {
            dayOfWeek: salonWeekday(date),
            excludeAppointmentId: options?.excludeAppointmentId,
        },
    )
    return computeOpenSlots(date, availability, timeOff, bookedTimes, options?.allowPast ?? false)
}

export async function getOpenDays(
    artistId: string,
    from: Date,
    days: number,
    durationMinutes: number,
    options?: { excludeAppointmentId?: string },
): Promise<{ dateKey: string; firstStart: Date }[]> {
    const dates = Array.from({ length: days }, (_, i) => addDays(startOfDay(from), i))
    const { availability, timeOff, bookedTimes } = await loadSlotInputs(
        artistId,
        dates[0],
        endOfDay(dates[dates.length - 1]),
        { excludeAppointmentId: options?.excludeAppointmentId },
    )

    return dates.flatMap((date) => {
        const windows = availability.filter((row) => row.dayOfWeek === salonWeekday(date))
        if (windows.length === 0) return []
        const open = computeOpenSlots(
            date,
            windows,
            timeOff.filter((row) => timeOffAppliesOn(row, date)),
            bookedTimes,
            false,
        )
        const [first] = fittingStarts(open, durationMinutes)
        return first ? [{ dateKey: toLocalDateKey(date), firstStart: first }] : []
    })
}

export async function getNextOpenings(
    artistIds: string[],
    durationMinutes: number,
    days: number,
): Promise<Record<string, Date | null>> {
    const results = await Promise.all(
        artistIds.map(async (artistId) => {
            const [first] = await getOpenDays(artistId, new Date(), days, durationMinutes)
            return [artistId, first?.firstStart ?? null] as const
        }),
    )
    return Object.fromEntries(results)
}

export async function getWorkingWindows(
    artistIds: string[],
    date: Date,
): Promise<ArtistWorkingWindow[]> {
    const dayOfWeek = salonWeekday(date)

    const rows = await prisma.availability.findMany({
        where: { artistId: { in: artistIds }, dayOfWeek },
    })

    return artistIds.map((artistId) => {
        const artistRows = rows.filter((row) => row.artistId === artistId)

        if (artistRows.length === 0) {
            return { artistId, start: null, end: null }
        }

        const start = artistRows.reduce(
            (min, row) => (row.startTime < min ? row.startTime : min),
            artistRows[0].startTime,
        )
        const end = artistRows.reduce(
            (max, row) => (row.endTime > max ? row.endTime : max),
            artistRows[0].endTime,
        )

        return { artistId, start, end }
    })
}

export async function getTimeOffForDay(artistIds: string[], date: Date): Promise<ArtistTimeOff[]> {
    const rows = await prisma.timeOff.findMany({
        where: {
            AND: [
                { OR: [{ artistId: { in: artistIds } }, { artistId: null }] },
                timeOffDateRangeOverlap(startOfDay(date), endOfDay(date)),
            ],
        },
        orderBy: { startTime: "asc" },
    })

    return rows.flatMap((row) =>
        (row.artistId === null ? artistIds : [row.artistId]).map((artistId) => ({
            artistId,
            start: row.startTime,
            end: row.endTime,
            salonWide: row.artistId === null,
        })),
    )
}

export function isValidTimeString(s: string) {
    const isMatch = TIME_PATTERN.test(s)
    return isMatch
}

export function isGridAligned(time: string) {
    const [, minutes] = time.split(":").map(Number)
    return minutes % 15 === 0
}
