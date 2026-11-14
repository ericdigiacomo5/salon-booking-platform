import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppointmentStatus, type Prisma } from "@/generated/prisma/client"
import { BookingFilters } from "@/components/admin/booking-filters"
import { ScheduleGrid } from "@/components/admin/schedule-grid"
import { DatePicker } from "@/components/admin/admin-date-picker"
import { MonthCalendar } from "@/components/admin/month-calendar"
import { ScheduleViewToggle } from "@/components/admin/schedule-view-toggle"
import {
    startOfDay,
    endOfDay,
    getWorkingWindows,
    getGridBounds,
    getTimeOffForDay,
} from "@/lib/availability"
import { parseScheduleView, startOfWeek, type ScheduleColumn } from "@/lib/schedule-grid"
import { addDays } from "@/lib/recurring"
import { toLocalDateKey, parseLocalDate } from "@/lib/format"
import { getPolicySettings, getRetailTaxRate } from "@/lib/settings"
import { LIVE_RETAIL_SALES_INCLUDE } from "@/lib/retail-data"
import { SERVICE_LINES_INCLUDE } from "@/lib/appointment-services"
import { SAFE_USER_SELECT_BASIC } from "@/lib/user-select"
import { requireAdminPage } from "@/lib/require-admin-page"
import { ARTIST_SERVICES_INCLUDE, offeredServiceIdsOf } from "@/lib/artist-services"
import { formatSalonDate } from "@/lib/salon-time"
import { CATEGORY_ORDER } from "@/lib/service-category"

export const metadata: Metadata = { title: "Admin: Schedule" }

export default async function AdminBookingsPage({
    searchParams,
}: {
    searchParams: Promise<{
        status?: string
        artistId?: string
        dateString?: string
        dateDown?: string
        dateUp?: string
        view?: string
    }>
}) {
    await requireAdminPage("/admin")

    const params = await searchParams
    const statusParam = params.status ?? ""
    const view = parseScheduleView(params.view)

    const parsedDate = params.dateString ? parseLocalDate(params.dateString) : null
    const date = parsedDate ?? new Date()

    const allArtists = await prisma.artist.findMany({
        where: { active: true },
        include: ARTIST_SERVICES_INCLUDE,
        orderBy: { createdAt: "asc" },
    })

    const weekNeedsArtist = view === "week" && !allArtists.some((a) => a.id === params.artistId)
    const artistIdParam = weekNeedsArtist ? (allArtists[0]?.id ?? "") : (params.artistId ?? "")

    const delta = (params.dateDown ? -1 : params.dateUp ? 1 : 0) * (view === "week" ? 7 : 1)
    if (delta !== 0 || !parsedDate || (weekNeedsArtist && artistIdParam)) {
        const query = new URLSearchParams()
        query.set("dateString", toLocalDateKey(addDays(date, delta)))
        if (statusParam) query.set("status", statusParam)
        if (artistIdParam) query.set("artistId", artistIdParam)
        if (view === "week") query.set("view", "week")

        redirect(`/admin?${query.toString()}`)
    }

    const days =
        view === "week"
            ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(date), i))
            : [date]

    const where: Prisma.AppointmentWhereInput = {
        startTime: {
            gte: startOfDay(days[0]),
            lte: endOfDay(days[days.length - 1]),
        },
    }

    if (statusParam && (Object.values(AppointmentStatus) as string[]).includes(statusParam)) {
        where.status = statusParam as AppointmentStatus
    } else {
        where.status = { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] }
    }

    if (artistIdParam) {
        where.artistId = artistIdParam
    }

    const [appointments, services, categories, policy, products, taxRateMillipercent] =
        await Promise.all([
            prisma.appointment.findMany({
                where,
                include: {
                    artist: true,
                    ...SERVICE_LINES_INCLUDE,
                    user: { select: SAFE_USER_SELECT_BASIC },
                    ...LIVE_RETAIL_SALES_INCLUDE,
                },
                orderBy: { startTime: "asc" },
            }),
            prisma.service.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
            prisma.serviceCategory.findMany({ orderBy: CATEGORY_ORDER }),
            getPolicySettings(),
            prisma.product.findMany({
                where: { active: true },
                select: { id: true, name: true, priceCents: true },
                orderBy: { name: "asc" },
            }),
            getRetailTaxRate(),
        ])

    const artists = artistIdParam ? allArtists.filter((a) => a.id === artistIdParam) : allArtists
    const artistIds = artists.map((a) => a.id)

    const offeredServiceIds = Object.fromEntries(
        allArtists.map((a) => [a.id, offeredServiceIdsOf(a)]),
    )

    const customerIds = [...new Set(appointments.map((a) => a.userId))]
    const noShowRows = customerIds.length
        ? await prisma.appointment.groupBy({
              by: ["userId"],
              where: { userId: { in: customerIds }, status: AppointmentStatus.NO_SHOW },
              _count: { _all: true },
          })
        : []
    const noShowCounts = Object.fromEntries(noShowRows.map((row) => [row.userId, row._count._all]))
    const [workingWindowsByDay, timeOffByDay] = await Promise.all([
        Promise.all(days.map((day) => getWorkingWindows(artistIds, day))),
        Promise.all(days.map((day) => getTimeOffForDay(artistIds, day))),
    ])
    const gridBounds = getGridBounds(workingWindowsByDay.flat())

    const todayKey = toLocalDateKey(new Date())
    const colorIndexOf = (artistId: string) => allArtists.findIndex((a) => a.id === artistId)
    const columns: ScheduleColumn[] = days.flatMap((day, dayIndex) =>
        artists.map((artist) => ({
            artist,
            date: day,
            heading:
                view === "week"
                    ? formatSalonDate(day, { weekday: "short", month: "short", day: "numeric" })
                    : artist.name,
            isToday: view === "week" && toLocalDateKey(day) === todayKey,
            colorIndex: colorIndexOf(artist.id),
            workingWindow: workingWindowsByDay[dayIndex].find((w) => w.artistId === artist.id) ?? {
                artistId: artist.id,
                start: null,
                end: null,
            },
            timeOff: timeOffByDay[dayIndex].filter((t) => t.artistId === artist.id),
        })),
    )

    const dateKey = toLocalDateKey(date)
    const calendarProps = {
        selectedDateKey: dateKey,
        todayKey,
        status: statusParam,
        artistId: artistIdParam,
        scheduleView: view,
    }

    return (
        <div>
            <BookingFilters
                artists={allArtists}
                currentStatus={statusParam}
                currentArtistId={artistIdParam}
                currentDateString={toLocalDateKey(date)}
                view={view}
            />
            <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-6">
                <aside className="hidden lg:mt-4 lg:block">
                    <MonthCalendar key={dateKey} {...calendarProps} />
                </aside>

                <div className="min-w-0">
                    <details className="mt-4 lg:hidden">
                        <summary className="flex h-11 cursor-pointer items-center text-sm font-medium text-foreground">
                            Jump to a date
                        </summary>
                        <div className="mt-2">
                            <MonthCalendar key={dateKey} {...calendarProps} />
                        </div>
                    </details>

                    <ScheduleViewToggle
                        view={view}
                        dateString={dateKey}
                        status={statusParam}
                        artistId={artistIdParam}
                        defaultArtistId={allArtists[0]?.id ?? null}
                    />
                    <DatePicker
                        date={date}
                        status={statusParam}
                        artistId={artistIdParam}
                        view={view}
                    />
                    <ScheduleGrid
                        key={`${view}|${dateKey}|${statusParam}|${artistIdParam}`}
                        initialAppointments={appointments}
                        view={view}
                        columns={columns}
                        services={services}
                        categories={categories}
                        offeredServiceIds={offeredServiceIds}
                        noShowCounts={noShowCounts}
                        gridBounds={gridBounds}
                        maxSeriesWeeks={policy.maxSeriesWeeks}
                        products={products}
                        taxRateMillipercent={taxRateMillipercent}
                        sellers={allArtists.map((artist) => ({
                            id: artist.id,
                            name: artist.name,
                        }))}
                    />
                </div>
            </div>
        </div>
    )
}
