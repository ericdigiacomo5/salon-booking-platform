"use client"

import { useSyncExternalStore } from "react"
import { SLOT_MINUTES } from "@/lib/schedule-grid"
import { salonMinutesOfDay } from "@/lib/salon-time"

function subscribe(onTick: () => void) {
    const interval = setInterval(onTick, 30_000)
    return () => clearInterval(interval)
}
const minuteOfDay = () => salonMinutesOfDay(new Date())

export function ScheduleNowLine({
    gridStartMinutes,
    gridEndMinutes,
    firstColumn,
    lastColumn,
}: {
    gridStartMinutes: number
    gridEndMinutes: number
    firstColumn: number
    lastColumn: number
}) {
    const minutes = useSyncExternalStore(subscribe, minuteOfDay, () => null)
    if (minutes === null || minutes < gridStartMinutes || minutes >= gridEndMinutes) return null

    const offset = minutes - gridStartMinutes
    const row = 2 + Math.floor(offset / SLOT_MINUTES)
    const fraction = (offset % SLOT_MINUTES) / SLOT_MINUTES

    return (
        <div
            aria-hidden
            className="pointer-events-none relative z-15 h-0.5 self-start bg-danger"
            style={{
                gridColumn: `${firstColumn} / ${lastColumn + 1}`,
                gridRow: `${row} / span 1`,
                marginTop: `calc(var(--schedule-row-height) * ${fraction})`,
            }}
        >
            <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-danger" />
        </div>
    )
}
