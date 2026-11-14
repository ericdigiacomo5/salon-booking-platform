import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { MyBookingsList } from "@/components/account/my-bookings-list"
import { MyRecurringAppointments } from "@/components/account/my-recurring-appointments"
import { SERVICE_LINES_INCLUDE } from "@/lib/appointment-services"
import { upcomingSkipsInclude } from "@/lib/booking"
import { getPolicySettings } from "@/lib/settings"

export const metadata: Metadata = { title: "My Bookings" }

export default async function AppointmentsPage() {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/appointments")
    }

    const now = new Date()

    const [appointments, series, policy] = await Promise.all([
        prisma.appointment.findMany({
            where: { userId: session.user.id },
            include: { artist: true, ...SERVICE_LINES_INCLUDE },
            orderBy: { startTime: "asc" },
        }),
        prisma.recurringAppointment.findMany({
            where: { userId: session.user.id },
            include: { artist: true, ...SERVICE_LINES_INCLUDE, ...upcomingSkipsInclude() },
            orderBy: { createdAt: "desc" },
        }),
        getPolicySettings(),
    ])

    return (
        <div className="mx-auto max-w-3xl px-4 py-14">
            <span className="font-script text-2xl text-lacquer">Your</span>
            <h1 className="mt-1 font-serif text-4xl font-extrabold text-foreground">Bookings</h1>
            <MyBookingsList
                appointments={appointments}
                cancellationNoticeHours={policy.cancellationNoticeHours}
                now={now.getTime()}
            />
            <MyRecurringAppointments series={series} />
        </div>
    )
}
