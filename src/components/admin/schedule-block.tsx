import { SLOT_MINUTES } from "@/lib/schedule-grid"
import { salonMinutesOfDay } from "@/lib/salon-time"
import { servicesLabel } from "@/lib/appointment-services"
import {
    appointmentColor,
    CATEGORY_BLOCK_COLOR,
    STATUS_BAR_COLOR,
    type AdminAppointment,
    type CategoryColors,
} from "./appointment-shared"

export function ScheduleBlock({
    appointment,
    gridStartMinutes,
    column,
    categoryColors,
    onSelect,
}: {
    appointment: AdminAppointment
    gridStartMinutes: number
    column: number
    categoryColors: CategoryColors
    onSelect: (id: string) => void
}) {
    const start = new Date(appointment.startTime)
    const startMinutes = salonMinutesOfDay(start)
    const durationMinutes = (new Date(appointment.endTime).getTime() - start.getTime()) / 60_000

    const startRow = 2 + (startMinutes - gridStartMinutes) / SLOT_MINUTES
    const rowSpan = durationMinutes / SLOT_MINUTES

    const color = CATEGORY_BLOCK_COLOR[appointmentColor(appointment, categoryColors)]

    return (
        <button
            type="button"
            onClick={() => onSelect(appointment.id)}
            style={{ gridColumn: column, gridRow: `${startRow} / span ${rowSpan}` }}
            className={
                "relative flex cursor-pointer flex-col overflow-hidden rounded-sm border px-2 py-1 text-left " +
                `${color.block} ${color.blockBorder}`
            }
        >
            <span
                className={`absolute inset-y-0 left-0 w-1 ${STATUS_BAR_COLOR[appointment.status]}`}
                aria-hidden
            />
            <span className="truncate pl-1.5 text-xs font-medium text-surface-foreground">
                {servicesLabel(appointment.services)}
            </span>
            <span className="truncate pl-1.5 text-xs text-muted-foreground">
                {appointment.user.name ?? appointment.user.email}
            </span>
        </button>
    )
}
