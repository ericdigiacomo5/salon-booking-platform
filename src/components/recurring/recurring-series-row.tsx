import type { Artist, RecurringAppointment, RecurringStatus, User } from "@/generated/prisma/client"
import { servicesLabel } from "@/lib/appointment-services"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { parseLocalDate } from "@/lib/format"
import { timeStringToDate } from "@/lib/schedule-grid"
import { formatSalonDate, formatSalonTime } from "@/lib/salon-time"

export type RecurringSeriesUser = Pick<User, "id" | "name" | "email">

export type RecurringAppointmentWithRelations = RecurringAppointment & {
    artist: Artist
    services: { service: { id: string; name: string } }[]
    user?: RecurringSeriesUser
    skippedOccurrences?: { occurrenceDate: string; reason: string }[]
}

export const RECURRING_STATUS_TONE: Record<RecurringStatus, "success" | "danger"> = {
    ACTIVE: "success",
    CANCELLED: "danger",
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

function formatTime(time: string): string {
    return formatSalonTime(timeStringToDate(new Date(), time))
}

function formatShortDate(date: Date): string {
    return formatSalonDate(date, { weekday: "short", month: "short", day: "numeric" })
}

function formatEndDate(date: Date): string {
    return formatSalonDate(date, { month: "short", day: "numeric", year: "numeric" })
}

function seriesLabel(
    series: Pick<RecurringAppointment, "dayOfWeek" | "startTime" | "intervalWeeks">,
): string {
    const day = DAY_NAMES[series.dayOfWeek]
    const time = formatTime(series.startTime)
    return series.intervalWeeks === 1
        ? `Every ${day} at ${time}`
        : `Every ${series.intervalWeeks} weeks on ${day} at ${time}`
}

export function RecurringSeriesRow({
    series,
    showCustomer,
    busy = false,
    confirming = false,
    onCancel,
    onConfirm,
    onConfirmBack,
}: {
    series: RecurringAppointmentWithRelations
    showCustomer: boolean
    busy?: boolean
    confirming?: boolean
    onCancel?: () => void
    onConfirm?: () => void
    onConfirmBack?: () => void
}) {
    const skipped = series.skippedOccurrences ?? []

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-start sm:justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-foreground">
                        {servicesLabel(series.services)}
                    </span>
                    <Badge tone={RECURRING_STATUS_TONE[series.status]}>{series.status}</Badge>
                </div>
                {showCustomer && series.user && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {series.user.name ?? series.user.email}
                    </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">with {series.artist.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{seriesLabel(series)}</p>
                {series.status !== "CANCELLED" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        Ends {formatEndDate(new Date(series.seriesEnd))}
                    </p>
                )}
                {series.status !== "CANCELLED" && skipped.length > 0 && (
                    <div className="mt-2 text-xs text-danger">
                        <p className="font-medium">Not booked:</p>
                        <ul className="mt-0.5">
                            {skipped.map((s) => {
                                const date = parseLocalDate(s.occurrenceDate)
                                return (
                                    <li key={s.occurrenceDate}>
                                        {date ? formatShortDate(date) : s.occurrenceDate} —{" "}
                                        {s.reason}
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )}
            </div>

            {!onCancel ? null : confirming ? (
                <div className="flex flex-col gap-2 sm:items-end">
                    <p role="alert" className="text-sm text-danger sm:max-w-64 sm:text-right">
                        Cancel this series and free its upcoming appointments?
                    </p>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="md" onClick={onConfirmBack} disabled={busy}>
                            Back
                        </Button>
                        <Button variant="danger" size="md" onClick={onConfirm} disabled={busy}>
                            Confirm Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                series.status === "ACTIVE" && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button variant="quiet" size="md" onClick={onCancel} disabled={busy}>
                            Cancel
                        </Button>
                    </div>
                )
            )}
        </div>
    )
}
