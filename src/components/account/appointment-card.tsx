import type { Appointment, AppointmentStatus, Artist } from "@/generated/prisma/client"
import { servicesLabel, servicesPriceCents, type ServiceLine } from "@/lib/appointment-services"
import { Badge } from "@/components/ui/badge"
import { Price } from "@/components/ui/price"
import { discountOf } from "@/lib/discount"
import { formatDuration } from "@/lib/format"
import { durationMinutesOf } from "@/lib/schedule-grid"
import { formatSalonDateTime } from "@/lib/salon-time"

export type AppointmentWithRelations = Appointment & { artist: Artist; services: ServiceLine[] }

const STATUS_TONE: Record<AppointmentStatus, "primary" | "success" | "danger" | "muted"> = {
    PENDING: "primary",
    CONFIRMED: "success",
    CANCELLED: "danger",
    COMPLETED: "muted",
    NO_SHOW: "danger",
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED",
    NO_SHOW: "NO-SHOW",
}

export function AppointmentCard({
    appointment,
    upcoming,
    footer,
}: {
    appointment: AppointmentWithRelations
    upcoming: boolean
    footer?: React.ReactNode
}) {
    return (
        <div
            className={
                upcoming
                    ? "rounded-xl border border-line border-l-4 border-l-lacquer bg-surface p-5 shadow-card"
                    : "rounded-xl border border-line bg-surface/70 p-5"
            }
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="font-serif text-lg font-bold text-surface-foreground">
                        {servicesLabel(appointment.services)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        with {appointment.artist.name}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatSalonDateTime(appointment.startTime, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                        })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {formatDuration(durationMinutesOf(appointment))} &middot;{" "}
                        <Price
                            priceCents={servicesPriceCents(appointment.services)}
                            discount={discountOf(appointment)}
                        />
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Badge tone={STATUS_TONE[appointment.status]}>
                        {STATUS_LABEL[appointment.status]}
                    </Badge>
                </div>
            </div>
            {footer}
        </div>
    )
}
