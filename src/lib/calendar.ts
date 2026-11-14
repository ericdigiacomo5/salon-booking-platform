export type CalendarEvent = {
    uid: string
    title: string
    start: Date
    end: Date
    description?: string
    location?: string
}

export function toCalendarUtc(date: Date): string {
    return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "")
}

export function googleCalendarUrl(event: CalendarEvent): string {
    const params = new URLSearchParams({
        action: "TEMPLATE",
        text: event.title,
        dates: `${toCalendarUtc(event.start)}/${toCalendarUtc(event.end)}`,
    })
    if (event.description) params.set("details", event.description)
    if (event.location) params.set("location", event.location)
    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function escapeText(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n")
}

function fold(line: string): string {
    if (line.length <= 75) return line
    const parts = [line.slice(0, 75)]
    for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`)
    return parts.join("\r\n")
}

export function icsFile(events: CalendarEvent[], now: Date = new Date()): string {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Demo Nail Salon//Booking//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]
    for (const event of events) {
        lines.push(
            "BEGIN:VEVENT",
            `UID:${event.uid}`,
            `DTSTAMP:${toCalendarUtc(now)}`,
            `DTSTART:${toCalendarUtc(event.start)}`,
            `DTEND:${toCalendarUtc(event.end)}`,
            `SUMMARY:${escapeText(event.title)}`,
            ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
            ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
            "END:VEVENT",
        )
    }
    lines.push("END:VCALENDAR")
    return lines.map(fold).join("\r\n") + "\r\n"
}
