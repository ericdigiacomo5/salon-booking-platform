import { ChevronLeft, ChevronRight } from "lucide-react"
import { toLocalDateKey } from "@/lib/format"
import { addDays } from "@/lib/recurring"
import { startOfWeek, type ScheduleView } from "@/lib/schedule-grid"
import { formatSalonDate, zonedParts } from "@/lib/salon-time"

function weekLabel(date: Date): string {
    const start = startOfWeek(date)
    const end = addDays(start, 6)
    const startText = formatSalonDate(start, { month: "short", day: "numeric" })
    const endText = formatSalonDate(
        end,
        zonedParts(start).month === zonedParts(end).month
            ? { day: "numeric" }
            : { month: "short", day: "numeric" },
    )
    return `${startText} – ${endText}`
}

export function DatePicker({
    date,
    status,
    artistId,
    view,
}: {
    date: Date
    status: string
    artistId: string
    view: ScheduleView
}) {
    const unit = view === "week" ? "week" : "day"
    return (
        <form
            method="get"
            className="mt-4 flex items-center justify-center gap-4 rounded-lg border border-line bg-surface shadow-sm p-3"
        >
            <input type="hidden" name="dateString" value={toLocalDateKey(date)} />
            <input type="hidden" name="status" value={status} />
            <input type="hidden" name="artistId" value={artistId} />
            {view === "week" && <input type="hidden" name="view" value="week" />}

            <button
                type="submit"
                name="dateDown"
                value="-1"
                aria-label={`Previous ${unit}`}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>

            <span className="min-w-36 text-center text-sm font-medium text-surface-foreground">
                {view === "week"
                    ? weekLabel(date)
                    : formatSalonDate(date, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                      })}
            </span>

            <button
                type="submit"
                name="dateUp"
                value="1"
                aria-label={`Next ${unit}`}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
                <ChevronRight className="h-5 w-5" />
            </button>
        </form>
    )
}
