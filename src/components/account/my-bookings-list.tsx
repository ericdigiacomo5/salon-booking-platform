import { CalendarDays } from "lucide-react"
import { AppointmentCard, type AppointmentWithRelations } from "./appointment-card"
import { AddToCalendar } from "./add-to-calendar"
import { EmptyState } from "@/components/ui/empty-state"
import { CallToBook } from "@/components/ui/call-to-book"
import { servicesLabel } from "@/lib/appointment-services"
import { describeNoticeWindow } from "@/lib/recurring"
import { BOOKING_PHONE, SALON_CONTACT, SITE_NAME, formatPhone } from "@/lib/site"

function isUpcoming(appointment: AppointmentWithRelations, now: number) {
    const isActive = appointment.status === "PENDING" || appointment.status === "CONFIRMED"
    const isFuture = new Date(appointment.startTime).getTime() > now
    return isActive && isFuture
}

const LOCATION = SALON_CONTACT.address ?? `${SITE_NAME}, Anytown, NY`

export function MyBookingsList({
    appointments,
    cancellationNoticeHours,
    now,
}: {
    appointments: AppointmentWithRelations[]
    cancellationNoticeHours: number
    now: number
}) {
    const phone = formatPhone(BOOKING_PHONE)
    const changeNote =
        cancellationNoticeHours > 0
            ? `To change or cancel, call us at ${phone} — at least ${describeNoticeWindow(cancellationNoticeHours)} ahead, please.`
            : `To change or cancel, call us at ${phone}.`

    if (appointments.length === 0) {
        return (
            <EmptyState
                icon={CalendarDays}
                title="Nothing booked yet"
                action={<CallToBook />}
                className="mt-8"
            >
                {`Your appointments will show up here once they're booked. Call us at ${phone} to book.`}
            </EmptyState>
        )
    }

    const upcoming = appointments.filter((a) => isUpcoming(a, now))
    const other = appointments.filter((a) => !isUpcoming(a, now))

    return (
        <div className="mt-8 flex flex-col gap-10">
            {upcoming.length === 0 && (
                <EmptyState
                    icon={CalendarDays}
                    title="No upcoming bookings"
                    action={<CallToBook />}
                >
                    Time for a fresh set? Your past visits are below.
                </EmptyState>
            )}

            {upcoming.length > 0 && (
                <section>
                    <h2 className="font-serif text-2xl font-extrabold text-foreground">Upcoming</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{changeNote}</p>
                    <div className="mt-5 flex flex-col gap-4">
                        {upcoming.map((appointment) => (
                            <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                upcoming
                                footer={
                                    <AddToCalendar
                                        event={{
                                            uid: `${appointment.id}@demo-nail-salon`,
                                            title: `${servicesLabel(appointment.services)} with ${appointment.artist.name}`,
                                            start: new Date(appointment.startTime),
                                            end: new Date(appointment.endTime),
                                            description: `${SITE_NAME}. ${changeNote}`,
                                            location: LOCATION,
                                        }}
                                    />
                                }
                            />
                        ))}
                    </div>
                </section>
            )}

            {other.length > 0 && (
                <section>
                    <h2 className="font-serif text-2xl font-extrabold text-foreground">
                        Past &amp; Cancelled
                    </h2>
                    <div className="mt-5 flex flex-col gap-4">
                        {other.map((appointment) => (
                            <AppointmentCard
                                key={appointment.id}
                                appointment={appointment}
                                upcoming={false}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
