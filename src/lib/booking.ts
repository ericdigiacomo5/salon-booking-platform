import { prisma } from "@/lib/prisma"
import { Prisma, RecurringStatus } from "@/generated/prisma/client"
import type { RecurringAppointment } from "@/generated/prisma/client"
import { getOpenSlots, timeStringToDate } from "@/lib/availability"
import { generateOccurrenceDates, SKIP_REASON } from "@/lib/recurring"
import { toLocalDateKey } from "@/lib/format"
import { SERVICE_LINES_INCLUDE, servicesDurationMinutes } from "@/lib/appointment-services"

const SLOT_DURATION_MS = 15 * 60_000

function slotStartsFor(startTime: Date, durationMinutes: number): Date[] {
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000)
    const slots: Date[] = []
    for (
        let current = startTime;
        current < endTime;
        current = new Date(current.getTime() + SLOT_DURATION_MS)
    ) {
        slots.push(current)
    }
    return slots
}

async function isFullyOpen(artistId: string, slots: Date[], allowPast: boolean): Promise<boolean> {
    const openSlots = await getOpenSlots(artistId, slots[0], { allowPast })
    const openSlotTimes = new Set(openSlots.map((slot) => slot.getTime()))
    return slots.every((slot) => openSlotTimes.has(slot.getTime()))
}

export type ServiceToBook = { serviceId: string; priceCents: number; durationMinutes: number }

export async function loadServicesToBook(
    serviceIds: string[],
    options: { requireActive?: boolean } = {},
): Promise<ServiceToBook[] | null> {
    const rows = await prisma.service.findMany({ where: { id: { in: serviceIds } } })
    const byId = new Map(rows.map((row) => [row.id, row]))
    if (serviceIds.some((id) => !byId.has(id))) return null
    if (options.requireActive && rows.some((row) => !row.active)) return null

    return serviceIds.map((id) => {
        const service = byId.get(id)!
        return {
            serviceId: id,
            priceCents: service.priceCents,
            durationMinutes: service.durationMinutes,
        }
    })
}

export type BookedAppointment = Prisma.AppointmentGetPayload<{
    include: typeof SERVICE_LINES_INCLUDE
}>

export type BookOccurrenceResult =
    { ok: true; appointment: BookedAppointment } | { ok: false; error: string; status: number }

export async function bookOccurrence(params: {
    userId: string
    artistId: string
    services: ServiceToBook[]
    durationMinutes?: number
    startTime: Date
    recurringAppointmentId?: string
    occurrenceDate?: string
    allowPast?: boolean
}): Promise<BookOccurrenceResult> {
    const {
        userId,
        artistId,
        services,
        startTime,
        recurringAppointmentId,
        occurrenceDate,
        allowPast,
    } = params

    const durationMinutes = params.durationMinutes ?? servicesDurationMinutes(services)
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000)
    const slots = slotStartsFor(startTime, durationMinutes)

    if (!(await isFullyOpen(artistId, slots, allowPast ?? false))) {
        return { ok: false, error: "That time is not available", status: 400 }
    }

    try {
        const appointment = await prisma.$transaction(async (tx) => {
            const appointment = await tx.appointment.create({
                data: {
                    userId,
                    artistId,
                    startTime,
                    endTime,
                    recurringAppointmentId,
                    occurrenceDate,
                    services: {
                        create: services.map((service, position) => ({ ...service, position })),
                    },
                },
                include: SERVICE_LINES_INCLUDE,
            })

            await tx.appointmentSlot.createMany({
                data: slots.map((slotStart) => ({
                    artistId,
                    slotStart,
                    appointmentId: appointment.id,
                })),
            })

            return appointment
        })

        return { ok: true, appointment }
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return {
                ok: false,
                error: "That time was just booked, please pick another",
                status: 409,
            }
        }

        throw error
    }
}

export class SlotUnavailableError extends Error {
    constructor() {
        super("SLOT_UNAVAILABLE")
        this.name = "SlotUnavailableError"
    }
}

export async function reclaimSlots(
    tx: Prisma.TransactionClient,
    params: {
        appointmentId: string
        artistId: string
        startTime: Date
        durationMinutes: number
        allowPast: boolean
    },
): Promise<{ startTime: Date; endTime: Date }> {
    const { appointmentId, artistId, startTime, durationMinutes, allowPast } = params
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000)
    const slots = slotStartsFor(startTime, durationMinutes)

    await tx.appointmentSlot.deleteMany({ where: { appointmentId } })

    const openSlots = await getOpenSlots(artistId, startTime, {
        allowPast,
        excludeAppointmentId: appointmentId,
    })
    const openSlotTimes = new Set(openSlots.map((slot) => slot.getTime()))
    if (!slots.every((slot) => openSlotTimes.has(slot.getTime()))) {
        throw new SlotUnavailableError()
    }

    await tx.appointmentSlot.createMany({
        data: slots.map((slotStart) => ({ artistId, slotStart, appointmentId })),
    })

    return { startTime, endTime }
}

export type MaterializeResult = {
    created: { appointmentId: string; occurrenceDate: string; startTime: Date }[]
    skipped: { occurrenceDate: string; startTime: Date; reason: string }[]
}

export async function materializeSeries(
    seriesId: string,
    options: { allowPast?: boolean } = {},
): Promise<MaterializeResult> {
    const series = await prisma.recurringAppointment.findUniqueOrThrow({
        where: { id: seriesId },
        include: {
            services: {
                orderBy: { position: "asc" },
                include: { service: { select: { priceCents: true, durationMinutes: true } } },
            },
        },
    })

    const services: ServiceToBook[] = series.services.map((line) => ({
        serviceId: line.serviceId,
        priceCents: line.service.priceCents,
        durationMinutes: line.service.durationMinutes,
    }))

    const result: MaterializeResult = { created: [], skipped: [] }

    for (const date of generateOccurrenceDates(
        series.seriesStart,
        series.intervalWeeks,
        series.seriesEnd,
    )) {
        const occurrenceDate = toLocalDateKey(date)
        const startTime = timeStringToDate(date, series.startTime)

        const booked = await bookOccurrence({
            userId: series.userId,
            artistId: series.artistId,
            services,
            startTime,
            recurringAppointmentId: seriesId,
            occurrenceDate,
            allowPast: options.allowPast ?? false,
        })

        if (booked.ok) {
            result.created.push({ appointmentId: booked.appointment.id, occurrenceDate, startTime })
        } else {
            const reason = SKIP_REASON.UNAVAILABLE
            await prisma.recurringSkippedOccurrence.create({
                data: { recurringAppointmentId: seriesId, occurrenceDate, reason },
            })
            result.skipped.push({ occurrenceDate, startTime, reason })
        }
    }

    return result
}

export function upcomingSkipsInclude() {
    return {
        skippedOccurrences: {
            where: { occurrenceDate: { gte: toLocalDateKey(new Date()) } },
            orderBy: { occurrenceDate: "asc" as const },
            select: { occurrenceDate: true, reason: true },
        },
    }
}

export type CancelSeriesResult = {
    recurringAppointment: RecurringAppointment
    previousStatus: RecurringStatus
    freedAppointmentIds: string[]
}

export async function cancelRecurringSeries(
    recurringAppointmentId: string,
): Promise<CancelSeriesResult> {
    const now = new Date()

    return prisma.$transaction(async (tx) => {
        const previous = await tx.recurringAppointment.findUniqueOrThrow({
            where: { id: recurringAppointmentId },
            select: { status: true },
        })

        const recurringAppointment = await tx.recurringAppointment.update({
            where: { id: recurringAppointmentId },
            data: { status: RecurringStatus.CANCELLED },
        })

        const futureActive = await tx.appointment.findMany({
            where: {
                recurringAppointmentId,
                startTime: { gt: now },
                status: { in: ["PENDING", "CONFIRMED"] },
            },
            select: { id: true },
        })
        const freedAppointmentIds = futureActive.map((a) => a.id)

        if (freedAppointmentIds.length > 0) {
            await tx.appointmentSlot.deleteMany({
                where: { appointmentId: { in: freedAppointmentIds } },
            })
            await tx.appointment.updateMany({
                where: { id: { in: freedAppointmentIds } },
                data: { status: "CANCELLED" },
            })
        }

        return { recurringAppointment, previousStatus: previous.status, freedAppointmentIds }
    })
}
