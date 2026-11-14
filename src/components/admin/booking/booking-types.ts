import type { Appointment, RecurringAppointment } from "@/generated/prisma/client"
import type { ServiceLine } from "@/lib/appointment-services"

export type BookedAppointment = Appointment & { services: ServiceLine[] }

export type RecurringBookingResult = {
    recurringAppointment: RecurringAppointment
    created: BookedAppointment[]
    skipped: { date: string; reason: string }[]
}

export type SelectedUser = {
    id: string
    name: string | null
    email: string
    phone: string
    noShowCount?: number
}
