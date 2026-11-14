import type { Artist } from "@/generated/prisma/client"
import { zonedParts, zonedToInstant } from "@/lib/salon-time"

export const SLOT_MINUTES = 15

export const MAX_APPOINTMENT_MINUTES = 480

export function durationMinutesOf(appointment: {
    startTime: Date | string
    endTime: Date | string
}): number {
    return (
        (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) /
        60_000
    )
}

export function isValidAppointmentLength(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= SLOT_MINUTES &&
        value <= MAX_APPOINTMENT_MINUTES &&
        value % SLOT_MINUTES === 0
    )
}

export function appointmentLengthOptions(current: number): number[] {
    const options: number[] = []
    for (let minutes = SLOT_MINUTES; minutes <= 240; minutes += SLOT_MINUTES) options.push(minutes)
    if (!options.includes(current)) options.push(current)
    return options.sort((a, b) => a - b)
}

export type ArtistWorkingWindow = { artistId: string; start: string | null; end: string | null }

export type ArtistTimeOff = { artistId: string; start: string; end: string; salonWide: boolean }

export type ScheduleView = "day" | "week"

export function parseScheduleView(value: string | undefined): ScheduleView {
    return value === "week" ? "week" : "day"
}

export type ScheduleColumn = {
    artist: Artist
    date: Date
    heading: string
    isToday: boolean
    colorIndex: number
    workingWindow: ArtistWorkingWindow
    timeOff: ArtistTimeOff[]
}

export function startOfDay(date: Date): Date {
    const p = zonedParts(date)
    return zonedToInstant(p.year, p.month, p.day)
}

export function startOfWeek(date: Date): Date {
    const p = zonedParts(date)
    return zonedToInstant(p.year, p.month, p.day - p.weekday)
}

export function startOfMonth(date: Date): Date {
    const p = zonedParts(date)
    return zonedToInstant(p.year, p.month, 1)
}

export function endOfDay(date: Date): Date {
    const p = zonedParts(date)
    return new Date(zonedToInstant(p.year, p.month, p.day + 1).getTime() - 1)
}

export function timeStringToDate(date: Date, time: string): Date {
    const [hours, minutes] = time.split(":").map(Number)
    const p = zonedParts(date)
    return zonedToInstant(p.year, p.month, p.day, hours, minutes)
}

export function isOnSlotBoundary(date: Date): boolean {
    if (Number.isNaN(date.getTime())) return false
    const p = zonedParts(date)
    return p.minute % SLOT_MINUTES === 0 && p.second === 0 && date.getTime() % 1000 === 0
}

export function fittingStarts(openSlots: Date[], durationMinutes: number): Date[] {
    const open = new Set(openSlots.map((slot) => slot.getTime()))
    const slotsNeeded = Math.ceil(durationMinutes / SLOT_MINUTES)

    return openSlots.filter((slot) => {
        for (let i = 0; i < slotsNeeded; i++) {
            if (!open.has(slot.getTime() + i * SLOT_MINUTES * 60_000)) return false
        }
        return true
    })
}

export function partOfDay(date: Date): "Morning" | "Afternoon" | "Evening" {
    const hour = zonedParts(date).hour
    return hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"
}

const FALLBACK_GRID_BOUNDS = { start: "09:00", end: "17:00" } as const

export function getGridBounds(windows: ArtistWorkingWindow[]): { start: string; end: string } {
    const starts = windows.map((w) => w.start).filter((s): s is string => s !== null)
    const ends = windows.map((w) => w.end).filter((e): e is string => e !== null)

    if (starts.length === 0 || ends.length === 0) {
        return { ...FALLBACK_GRID_BOUNDS }
    }

    return {
        start: starts.reduce((min, s) => (s < min ? s : min)),
        end: ends.reduce((max, e) => (e > max ? e : max)),
    }
}
