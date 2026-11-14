import { startOfDay } from "@/lib/schedule-grid"
import { zonedParts, zonedToInstant } from "@/lib/salon-time"

export const DEFAULT_POLICY = { cancellationNoticeHours: 24, maxSeriesWeeks: 52 } as const
export const POLICY_LIMITS = {
    cancellationNoticeHours: { min: 0, max: 168 },
    maxSeriesWeeks: { min: 1, max: 104 },
} as const
export type PolicySettings = { cancellationNoticeHours: number; maxSeriesWeeks: number }

export const ADMIN_DAYS_AHEAD = 90

export const SKIP_REASON = {
    UNAVAILABLE: "That time wasn't available",
} as const

export function addDays(date: Date, days: number): Date {
    const p = zonedParts(date)
    return zonedToInstant(
        p.year,
        p.month,
        p.day + days,
        p.hour,
        p.minute,
        p.second,
        date.getTime() % 1000,
    )
}

export function maxSeriesEnd(seriesStart: Date, maxSeriesWeeks: number): Date {
    return addDays(startOfDay(seriesStart), maxSeriesWeeks * 7)
}

export function describeNoticeWindow(hours: number): string {
    if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`
    return hours === 1 ? "1 hour" : `${hours} hours`
}

export function generateOccurrenceDates(
    seriesStart: Date,
    intervalWeeks: number,
    seriesEnd: Date,
): Date[] {
    const dates: Date[] = []
    let current = seriesStart
    while (current.getTime() <= seriesEnd.getTime()) {
        dates.push(current)
        current = addDays(current, intervalWeeks * 7)
    }
    return dates
}
