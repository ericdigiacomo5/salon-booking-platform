"use client"

import { useState } from "react"
import type { AppointmentStatus, Service } from "@/generated/prisma/client"
import { SLOT_MINUTES, type ScheduleColumn, type ScheduleView } from "@/lib/schedule-grid"
import { toLocalDateKey } from "@/lib/format"
import type { Discount } from "@/lib/discount"
import { ScheduleTimeAxis } from "./schedule-time-axis"
import { ScheduleArtistColumn } from "./schedule-artist-column"
import { ScheduleDetailSheet, type Checkout, type Rebooking } from "./schedule-detail-sheet"
import { servicesLabel } from "@/lib/appointment-services"
import { ScheduleBookSheet } from "./schedule-book-sheet"
import { categoryColorOf, type ServiceCategoryInfo } from "@/lib/service-category"
import {
    CATEGORY_BLOCK_COLOR,
    STATUS_BAR_COLOR,
    STATUS_LABEL,
    type AdminAppointment,
    type CategoryColors,
} from "./appointment-shared"
import { useToast } from "@/components/ui/toast"
import { ScheduleNowLine } from "./schedule-now-line"
import type { ProductOption } from "./retail/product-picker"
import { formatSalonDateTime } from "@/lib/salon-time"

const ROW_HEIGHT = "var(--schedule-row-height)"

const STATUS_TOAST: Record<AppointmentStatus, string> = {
    PENDING: "Marked pending.",
    CONFIRMED: "Confirmed.",
    COMPLETED: "Checked out — receipt sent.",
    CANCELLED: "Cancelled — the customer has been emailed.",
    NO_SHOW: "Marked as a no-show.",
}

export function ScheduleGrid({
    initialAppointments,
    view,
    columns,
    services,
    categories,
    offeredServiceIds,
    noShowCounts,
    gridBounds,
    maxSeriesWeeks,
    products,
    taxRateMillipercent,
    sellers,
}: {
    initialAppointments: AdminAppointment[]
    view: ScheduleView
    columns: ScheduleColumn[]
    services: Service[]
    categories: ServiceCategoryInfo[]
    offeredServiceIds: Record<string, string[]>
    noShowCounts: Record<string, number>
    gridBounds: { start: string; end: string }
    maxSeriesWeeks: number
    products: ProductOption[]
    taxRateMillipercent: number
    sellers: { id: string; name: string }[]
}) {
    const [appointments, setAppointments] = useState(initialAppointments)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [bookingSlot, setBookingSlot] = useState<{ artistId: string; startTime: Date } | null>(
        null,
    )
    const [notice, setNotice] = useState<string | null>(null)
    const toast = useToast()

    const categoryColors: CategoryColors = Object.fromEntries(
        categories.map((category) => [category.id, categoryColorOf(category.color)]),
    )
    const shownCategoryIds = new Set(appointments.map((a) => a.services[0]?.service.categoryId))
    const legendCategories = categories.filter(
        (category) => category.active || shownCategoryIds.has(category.id),
    )

    const columnKey = (artistId: string, dateKey: string) => `${artistId}|${dateKey}`
    const displayedColumnKeys = new Set(
        columns.map((c) => columnKey(c.artist.id, toLocalDateKey(c.date))),
    )
    const appointmentColumnKey = (a: AdminAppointment) =>
        columnKey(a.artistId, toLocalDateKey(new Date(a.startTime)))
    const isDisplayed = (a: AdminAppointment) => displayedColumnKeys.has(appointmentColumnKey(a))

    function applyUpdate(id: string, updated: AdminAppointment) {
        const stillDisplayed = isDisplayed(updated)
        setAppointments((prev) =>
            stillDisplayed
                ? prev.map((a) => (a.id === id ? { ...a, ...updated } : a))
                : prev.filter((a) => a.id !== id),
        )
    }

    function handleBooked(created: AdminAppointment[], bookedNotice: string | null) {
        setAppointments((prev) => [...prev, ...created.filter(isDisplayed)])
        setNotice(bookedNotice)
        setBookingSlot(null)
    }

    async function updateStatus(id: string, status: AppointmentStatus, checkout?: Checkout) {
        setError(null)
        setBusyId(id)

        try {
            const res = await fetch(`/api/admin/appointments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status,
                    ...(checkout?.paymentMethod && { paymentMethod: checkout.paymentMethod }),
                    ...(checkout &&
                        checkout.creditCents > 0 && { creditCents: checkout.creditCents }),
                    ...(checkout?.retail && {
                        retailItems: checkout.retail.items,
                        retailArtistId: checkout.retail.artistId,
                    }),
                }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't update that booking. Please try again.")
                return
            }

            const body = await res.json()
            applyUpdate(id, body.data)
            toast(STATUS_TOAST[status])
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusyId(null)
        }
    }

    async function updateDiscount(id: string, discount: Discount | null) {
        setError(null)
        setBusyId(id)

        try {
            const res = await fetch(`/api/admin/appointments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ discount }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't update that discount. Please try again.")
                return
            }

            const body = await res.json()
            applyUpdate(id, body.data)
            toast(discount ? "Discount applied." : "Discount removed.")
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusyId(null)
        }
    }

    async function updateServices(id: string, serviceIds: string[]) {
        setError(null)
        setBusyId(id)

        try {
            const res = await fetch(`/api/admin/appointments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serviceIds }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(
                    body?.error ?? "Couldn't change that appointment's services. Please try again.",
                )
                return
            }

            const body = await res.json()
            applyUpdate(id, body.data)
            toast("Services updated.")
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusyId(null)
        }
    }

    async function updateLength(id: string, durationMinutes: number) {
        setError(null)
        setBusyId(id)

        try {
            const res = await fetch(`/api/admin/appointments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ durationMinutes }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(
                    body?.error ?? "Couldn't change that appointment's length. Please try again.",
                )
                return
            }

            const body = await res.json()
            applyUpdate(id, body.data)
            toast("Length updated.")
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusyId(null)
        }
    }

    async function returnCredit(id: string, note: string) {
        setError(null)
        setBusyId(id)

        try {
            const res = await fetch(`/api/admin/appointments/${id}/return-credit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't return that credit. Please try again.")
                return
            }

            const body = await res.json()
            applyUpdate(id, body.data)
            toast("Store credit returned to the customer.")
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusyId(null)
        }
    }

    async function rescheduleAppointment(id: string, startTime: string) {
        setError(null)
        setBusyId(id)

        try {
            const res = await fetch(`/api/admin/appointments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startTime }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't reschedule that booking. Please try again.")
                return
            }

            const body = await res.json()
            applyUpdate(id, body.data)
            toast("Rescheduled — the customer has been emailed.")
            setSelectedId(null)
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusyId(null)
        }
    }

    async function rebook(from: AdminAppointment, rebooking: Rebooking) {
        setError(null)
        setBusyId(from.id)

        try {
            const res = await fetch("/api/admin/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    artistId: from.artistId,
                    userId: from.userId,
                    serviceIds: rebooking.serviceIds,
                    startTime: rebooking.startTime,
                    ...(rebooking.durationMinutes !== null && {
                        durationMinutes: rebooking.durationMinutes,
                    }),
                }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't book the next visit. Please try again.")
                return
            }

            const body = await res.json()
            const created: AdminAppointment = { ...body.data, artist: from.artist, user: from.user }
            const when = formatSalonDateTime(created.startTime, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            })
            handleBooked(
                [created],
                `Next visit booked for ${from.user.name ?? from.user.email}: ${servicesLabel(created.services)}, ${when}.`,
            )
            setSelectedId(null)
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusyId(null)
        }
    }

    if (columns.length === 0) {
        return <p className="mt-8 text-muted-foreground">No artists to schedule.</p>
    }

    const usingFallbackBounds = columns.every((c) => c.workingWindow.start === null)

    const [startHours, startMinutesPart] = gridBounds.start.split(":").map(Number)
    const [endHours, endMinutesPart] = gridBounds.end.split(":").map(Number)
    const gridStartMinutes = startHours * 60 + startMinutesPart
    const gridEndMinutes = endHours * 60 + endMinutesPart
    const totalRows = (gridEndMinutes - gridStartMinutes) / SLOT_MINUTES

    const todayKey = toLocalDateKey(new Date())
    const todayColumns = columns.flatMap((c, i) => (toLocalDateKey(c.date) === todayKey ? [i] : []))

    const selectedAppointment = appointments.find((a) => a.id === selectedId) ?? null
    const bookingArtist = bookingSlot
        ? (columns.find((c) => c.artist.id === bookingSlot.artistId)?.artist ?? null)
        : null

    return (
        <div className="mt-6">
            {usingFallbackBounds && (
                <p className="mb-3 text-sm text-muted-foreground">
                    {`No working hours are set for this ${view === "week" ? "week" : "date"} — showing a default 9am–5pm range.`}
                </p>
            )}

            {error && !selectedAppointment && (
                <p role="alert" className="mb-3 text-sm text-danger">
                    {error}
                </p>
            )}
            {notice && (
                <p role="status" className="mb-3 text-sm text-foreground">
                    {notice}
                </p>
            )}

            <p className="mb-3 text-sm text-muted-foreground">
                Click an open time to book an appointment.
            </p>

            <div className="mb-3 flex flex-col gap-1.5 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-6">
                <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Service categories">
                    {legendCategories.map((category) => {
                        const color = CATEGORY_BLOCK_COLOR[categoryColorOf(category.color)]
                        return (
                            <li key={category.id} className="flex items-center gap-1.5">
                                <span
                                    className={`h-3 w-3 rounded-sm border ${color.block} ${color.blockBorder}`}
                                    aria-hidden
                                />
                                {category.name}
                            </li>
                        )
                    })}
                </ul>
                <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Statuses">
                    {(["PENDING", "CONFIRMED", "COMPLETED"] as const).map((status) => (
                        <li key={status} className="flex items-center gap-1.5">
                            <span
                                className={`h-3 w-1 rounded-sm ${STATUS_BAR_COLOR[status]}`}
                                aria-hidden
                            />
                            {STATUS_LABEL[status].charAt(0) +
                                STATUS_LABEL[status].slice(1).toLowerCase()}
                        </li>
                    ))}
                    {todayColumns.length > 0 && (
                        <li className="flex items-center gap-1.5">
                            <span className="h-0.5 w-4 bg-danger" aria-hidden />
                            Now
                        </li>
                    )}
                </ul>
            </div>

            <div className="-mx-4 overflow-x-auto px-4">
                <div
                    className="grid"
                    style={{
                        gridTemplateColumns: `64px repeat(${columns.length}, minmax(${view === "week" ? 88 : 112}px, 1fr))`,
                        gridTemplateRows: `auto repeat(${totalRows}, ${ROW_HEIGHT})`,
                    }}
                >
                    <ScheduleTimeAxis gridStartMinutes={gridStartMinutes} totalRows={totalRows} />

                    {todayColumns.length > 0 && (
                        <ScheduleNowLine
                            gridStartMinutes={gridStartMinutes}
                            gridEndMinutes={gridEndMinutes}
                            firstColumn={todayColumns[0] + 2}
                            lastColumn={todayColumns[todayColumns.length - 1] + 2}
                        />
                    )}

                    {columns.map((scheduleColumn, index) => {
                        const key = columnKey(
                            scheduleColumn.artist.id,
                            toLocalDateKey(scheduleColumn.date),
                        )
                        return (
                            <ScheduleArtistColumn
                                key={key}
                                scheduleColumn={scheduleColumn}
                                columnIndex={index}
                                appointments={appointments.filter(
                                    (a) => appointmentColumnKey(a) === key,
                                )}
                                gridStartMinutes={gridStartMinutes}
                                totalRows={totalRows}
                                categoryColors={categoryColors}
                                onSelect={(id) => {
                                    setError(null)
                                    setSelectedId(id)
                                }}
                                onBookSlot={(artistId, startTime) => {
                                    setNotice(null)
                                    setBookingSlot({ artistId, startTime })
                                }}
                            />
                        )
                    })}
                </div>
            </div>

            <ScheduleDetailSheet
                key={selectedId}
                appointment={selectedAppointment}
                customerNoShows={
                    selectedAppointment ? (noShowCounts[selectedAppointment.userId] ?? 0) : 0
                }
                busy={busyId === selectedId}
                error={error}
                onConfirm={() => selectedId && updateStatus(selectedId, "CONFIRMED")}
                onCheckout={(checkout) =>
                    selectedId && updateStatus(selectedId, "COMPLETED", checkout)
                }
                onReturnCredit={(note) => selectedId && returnCredit(selectedId, note)}
                onCancel={() => selectedId && updateStatus(selectedId, "CANCELLED")}
                onNoShow={() => selectedId && updateStatus(selectedId, "NO_SHOW")}
                onReschedule={(startTime) =>
                    selectedId && rescheduleAppointment(selectedId, startTime)
                }
                onDiscount={(discount) => selectedId && updateDiscount(selectedId, discount)}
                onChangeLength={(minutes) => selectedId && updateLength(selectedId, minutes)}
                services={services}
                products={products}
                taxRateMillipercent={taxRateMillipercent}
                sellers={sellers}
                onChangeServices={(serviceIds) =>
                    selectedId && updateServices(selectedId, serviceIds)
                }
                onRebook={(rebooking) =>
                    selectedAppointment && rebook(selectedAppointment, rebooking)
                }
                onClose={() => {
                    setError(null)
                    setSelectedId(null)
                }}
            />

            {bookingSlot && bookingArtist && (
                <ScheduleBookSheet
                    key={`${bookingSlot.artistId}|${bookingSlot.startTime.getTime()}`}
                    artist={bookingArtist}
                    startTime={bookingSlot.startTime}
                    services={services}
                    offeredServiceIds={offeredServiceIds[bookingArtist.id] ?? []}
                    maxSeriesWeeks={maxSeriesWeeks}
                    onBooked={handleBooked}
                    onClose={() => setBookingSlot(null)}
                />
            )}
        </div>
    )
}
