import {
    calendarDateKey,
    dateKeyParts,
    formatSalonDate,
    zonedParts,
    zonedToInstant,
} from "@/lib/salon-time"

export function formatPrice(cents: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        cents / 100,
    )
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

export function toLocalDateKey(date: Date): string {
    const p = zonedParts(date)
    return calendarDateKey(p.year, p.month, p.day)
}

export function toLocalTimeKey(date: Date): string {
    const p = zonedParts(date)
    return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`
}

export function formatTimeOfDay(time: string): string {
    const [hours, minutes] = time.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const hour = hours % 12 === 0 ? 12 : hours % 12
    return minutes === 0
        ? `${hour} ${period}`
        : `${hour}:${String(minutes).padStart(2, "0")} ${period}`
}

export function formatOpening(date: Date, now: Date = new Date()): string {
    const time = formatTimeOfDay(toLocalTimeKey(date))
    const today = zonedParts(now)
    if (toLocalDateKey(date) === calendarDateKey(today.year, today.month, today.day))
        return `Today ${time}`
    if (toLocalDateKey(date) === calendarDateKey(today.year, today.month, today.day + 1))
        return `Tomorrow ${time}`
    return `${formatSalonDate(date, { weekday: "short", month: "short", day: "numeric" })}, ${time}`
}

export function parseLocalDate(value: string): Date | null {
    const parts = dateKeyParts(value)
    return parts ? zonedToInstant(parts.year, parts.month, parts.day) : null
}
