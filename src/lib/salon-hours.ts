import { prisma } from "@/lib/prisma"
import { endOfDay, startOfDay, timeOffDateRangeOverlap } from "@/lib/availability"
import { salonWeekday } from "@/lib/salon-time"

export type DayHours =
    | { dayOfWeek: number; open: string; close: string }
    | { dayOfWeek: number; open: null; close: null }

export type SalonHours = {
    week: DayHours[]
    today: DayHours
    closedToday: boolean
}

export async function getSalonHours(now: Date = new Date()): Promise<SalonHours> {
    const [rows, closures] = await Promise.all([
        prisma.availability.findMany({
            where: { artist: { active: true } },
            select: { dayOfWeek: true, startTime: true, endTime: true },
        }),
        prisma.timeOff.findMany({
            where: {
                AND: [{ artistId: null }, timeOffDateRangeOverlap(startOfDay(now), endOfDay(now))],
            },
            select: { startTime: true, endTime: true },
        }),
    ])

    const week: DayHours[] = Array.from({ length: 7 }, (_, dayOfWeek) => {
        const day = rows.filter((row) => row.dayOfWeek === dayOfWeek)
        if (day.length === 0) return { dayOfWeek, open: null, close: null }
        return {
            dayOfWeek,
            open: day.reduce(
                (min, row) => (row.startTime < min ? row.startTime : min),
                day[0].startTime,
            ),
            close: day.reduce(
                (max, row) => (row.endTime > max ? row.endTime : max),
                day[0].endTime,
            ),
        }
    })

    const today = week[salonWeekday(now)]
    const closedToday =
        today.open !== null &&
        closures.some(
            (closure) => closure.startTime <= today.open && closure.endTime >= today.close,
        )

    return { week, today, closedToday }
}
