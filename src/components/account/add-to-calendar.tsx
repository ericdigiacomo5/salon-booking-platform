"use client"

import { CalendarPlus } from "lucide-react"
import { googleCalendarUrl, icsFile, type CalendarEvent } from "@/lib/calendar"

export function AddToCalendar({ event }: { event: CalendarEvent }) {
    function downloadIcs() {
        const url = URL.createObjectURL(new Blob([icsFile([event])], { type: "text/calendar" }))
        const link = document.createElement("a")
        link.href = url
        link.download = "demo-nail-salon-appointment.ics"
        link.click()
        URL.revokeObjectURL(url)
    }

    const linkClass =
        "inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-accent hover:text-primary-strong"

    return (
        <div className="mt-3 flex flex-wrap items-center gap-x-5">
            <a
                href={googleCalendarUrl(event)}
                target="_blank"
                rel="noreferrer"
                className={linkClass}
            >
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Google Calendar
            </a>
            <button type="button" onClick={downloadIcs} className={linkClass}>
                <CalendarPlus className="h-4 w-4" aria-hidden />
                Apple / Outlook
            </button>
        </div>
    )
}
