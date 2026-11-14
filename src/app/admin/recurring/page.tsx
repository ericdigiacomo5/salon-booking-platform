import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { RecurringStatus, type Prisma } from "@/generated/prisma/client"
import { RecurringFilters } from "@/components/admin/recurring/recurring-filters"
import { AdminRecurringList } from "@/components/admin/recurring/admin-recurring-list"
import { SAFE_USER_SELECT_BASIC } from "@/lib/user-select"
import { upcomingSkipsInclude } from "@/lib/booking"
import { SERVICE_LINES_INCLUDE } from "@/lib/appointment-services"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Standing Appointments" }

export default async function AdminRecurringPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; artistId?: string }>
}) {
    await requireAdminPage("/admin/recurring")

    const params = await searchParams
    const statusParam = params.status ?? ""
    const artistIdParam = params.artistId ?? ""

    const where: Prisma.RecurringAppointmentWhereInput = {}

    if (statusParam && (Object.values(RecurringStatus) as string[]).includes(statusParam)) {
        where.status = statusParam as RecurringStatus
    }

    if (artistIdParam) {
        where.artistId = artistIdParam
    }

    const [series, allArtists] = await Promise.all([
        prisma.recurringAppointment.findMany({
            where,
            include: {
                artist: true,
                ...SERVICE_LINES_INCLUDE,
                user: { select: SAFE_USER_SELECT_BASIC },
                ...upcomingSkipsInclude(),
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.artist.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    ])

    return (
        <div>
            <h2 className="text-lg font-semibold text-foreground">Standing Appointments</h2>
            <RecurringFilters
                artists={allArtists}
                currentStatus={statusParam}
                currentArtistId={artistIdParam}
            />
            <AdminRecurringList initialSeries={series} />
        </div>
    )
}
