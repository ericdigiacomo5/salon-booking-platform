export const SALON_TIME_ZONE = "America/New_York"

export type ZonedParts = {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
    weekday: number
}

const PARTS_FORMAT = new Intl.DateTimeFormat("en-US", {
    timeZone: SALON_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
})

export function zonedParts(date: Date): ZonedParts {
    const values: Record<string, number> = {}
    for (const part of PARTS_FORMAT.formatToParts(date)) {
        if (part.type !== "literal") values[part.type] = Number(part.value)
    }
    const { year, month, day, minute, second } = values
    const hour = values.hour === 24 ? 0 : values.hour
    return { year, month, day, hour, minute, second, weekday: calendarWeekday(year, month, day) }
}

function offsetAt(instantMs: number): number {
    const p = zonedParts(new Date(instantMs))
    const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    return wallAsUtc - Math.floor(instantMs / 1000) * 1000
}

export function zonedToInstant(
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0,
    second = 0,
    ms = 0,
): Date {
    const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms)
    const firstGuess = wall - offsetAt(wall)
    return new Date(wall - offsetAt(firstGuess))
}

export function calendarWeekday(year: number, month: number, day: number): number {
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function calendarDateKey(year: number, month: number, day: number): string {
    const date = new Date(Date.UTC(year, month - 1, day))
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, "0")
    const d = String(date.getUTCDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

export function dateKeyParts(key: string): { year: number; month: number; day: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
    if (!match) return null
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
    if (calendarDateKey(year, month, day) !== key) return null
    return { year, month, day }
}

export function salonWeekday(date: Date): number {
    return zonedParts(date).weekday
}

export function salonMinutesOfDay(date: Date): number {
    const p = zonedParts(date)
    return p.hour * 60 + p.minute
}

export function salonYear(date: Date = new Date()): number {
    return zonedParts(date).year
}

type DateLike = Date | string | number

export function formatSalonDate(date: DateLike, options: Intl.DateTimeFormatOptions): string {
    return new Date(date).toLocaleDateString("en-US", { ...options, timeZone: SALON_TIME_ZONE })
}

export function formatSalonTime(
    date: DateLike,
    options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" },
): string {
    return new Date(date).toLocaleTimeString("en-US", { ...options, timeZone: SALON_TIME_ZONE })
}

export function formatSalonDateTime(date: DateLike, options: Intl.DateTimeFormatOptions): string {
    return new Date(date).toLocaleString("en-US", { ...options, timeZone: SALON_TIME_ZONE })
}
