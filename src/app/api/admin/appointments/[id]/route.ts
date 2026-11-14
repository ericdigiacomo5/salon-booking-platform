import { after } from "next/server"
import { requireAdminId } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { sendCancellationNotice, sendReceipt, sendRescheduleNotice } from "@/lib/appointment-emails"
import { prisma } from "@/lib/prisma"
import {
    AppointmentStatus,
    PaymentMethod,
    Prisma,
    type DiscountType,
} from "@/generated/prisma/client"
import {
    durationMinutesOf,
    isOnSlotBoundary,
    isValidAppointmentLength,
    MAX_APPOINTMENT_MINUTES,
} from "@/lib/schedule-grid"
import { discountError, discountOf, totalCents } from "@/lib/discount"
import { InsufficientCreditError, spendCredit } from "@/lib/credit"
import { snapshotPayAtCheckout } from "@/lib/pay-terms"
import {
    loadServicesToBook,
    reclaimSlots,
    SlotUnavailableError,
    type ServiceToBook,
} from "@/lib/booking"
import {
    parseServiceIds,
    SERVICE_LINES_INCLUDE,
    servicesDurationMinutes,
    servicesFitOneAppointment,
    servicesPriceCents,
} from "@/lib/appointment-services"
import { getRetailTaxRate } from "@/lib/settings"
import {
    parseRetailItems,
    retailSubtotalCents,
    retailTotals,
    savedSaleTotals,
    type RetailTotals,
} from "@/lib/retail"
import {
    createRetailSale,
    findSellingArtist,
    LIVE_RETAIL_SALES_INCLUDE,
    parseRetailDiscount,
    prepareRetailItems,
    type PreparedRetailItem,
} from "@/lib/retail-data"
import type { Discount } from "@/lib/discount"

class StaleCheckoutError extends Error {}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const adminId = await requireAdminId()
    if (adminId instanceof Response) return adminId

    const { id } = await params

    const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: { ...SERVICE_LINES_INCLUDE, ...LIVE_RETAIL_SALES_INCLUDE },
    })

    if (!appointment) {
        return Response.json({ error: "Appointment not found" }, { status: 404 })
    }

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const {
        status,
        paymentMethod,
        creditCents,
        startTime,
        durationMinutes,
        discount,
        serviceIds,
        retailItems,
        retailDiscount,
        retailArtistId,
    } = body

    if (
        status === undefined &&
        startTime === undefined &&
        durationMinutes === undefined &&
        discount === undefined &&
        serviceIds === undefined
    ) {
        return Response.json(
            { error: "Provide status, startTime, durationMinutes, serviceIds and/or discount" },
            { status: 400 },
        )
    }

    if (
        status !== undefined &&
        (typeof status !== "string" ||
            !(Object.values(AppointmentStatus) as string[]).includes(status))
    ) {
        return Response.json(
            { error: "Status must be one of PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW" },
            { status: 400 },
        )
    }

    if (
        (status === AppointmentStatus.PENDING || status === AppointmentStatus.CONFIRMED) &&
        (appointment.status === AppointmentStatus.CANCELLED ||
            appointment.status === AppointmentStatus.NO_SHOW)
    ) {
        return Response.json(
            {
                error: "A cancelled or no-show appointment can't be reopened — book a new appointment instead",
            },
            { status: 400 },
        )
    }

    if (status === AppointmentStatus.COMPLETED) {
        if (
            paymentMethod !== undefined &&
            paymentMethod !== null &&
            (typeof paymentMethod !== "string" ||
                !(Object.values(PaymentMethod) as string[]).includes(paymentMethod))
        ) {
            return Response.json(
                { error: "paymentMethod must be one of CASH, CARD, GROUPON, OTHER" },
                { status: 400 },
            )
        }
    } else if (paymentMethod !== undefined) {
        return Response.json(
            { error: "paymentMethod can only be set when status is COMPLETED" },
            { status: 400 },
        )
    }

    if (creditCents !== undefined) {
        if (status !== AppointmentStatus.COMPLETED) {
            return Response.json(
                { error: "creditCents can only be sent when status is COMPLETED" },
                { status: 400 },
            )
        }
        if (typeof creditCents !== "number" || !Number.isInteger(creditCents) || creditCents < 0) {
            return Response.json(
                { error: "creditCents must be a whole number of cents, 0 or more" },
                { status: 400 },
            )
        }
    }

    const existingSale = appointment.retailSales[0] ?? null
    let newRetail: {
        items: PreparedRetailItem[]
        discount: Discount | null
        artistId: string | null
        taxRateMillipercent: number
        totals: RetailTotals
    } | null = null
    if (retailItems !== undefined) {
        if (status !== AppointmentStatus.COMPLETED) {
            return Response.json(
                { error: "Products can only be added at checkout (status COMPLETED)" },
                { status: 400 },
            )
        }
        const requests = parseRetailItems(retailItems)
        if (typeof requests === "string") {
            return Response.json({ error: requests }, { status: 400 })
        }
        if (requests.length > 0) {
            if (existingSale) {
                return Response.json(
                    {
                        error: "This visit already has products. Void that sale on the Retail Sale page to change them.",
                    },
                    { status: 400 },
                )
            }
            const items = await prepareRetailItems(requests)
            if (!items) {
                return Response.json({ error: "Product not found" }, { status: 404 })
            }
            const parsedRetailDiscount = parseRetailDiscount(
                retailDiscount,
                retailSubtotalCents(items),
            )
            if (typeof parsedRetailDiscount === "string") {
                return Response.json({ error: parsedRetailDiscount }, { status: 400 })
            }
            const seller =
                retailArtistId === undefined
                    ? appointment.artistId
                    : await findSellingArtist(retailArtistId)
            if (seller === "missing") {
                return Response.json({ error: "Artist not found" }, { status: 404 })
            }
            const taxRateMillipercent = await getRetailTaxRate()
            newRetail = {
                items,
                discount: parsedRetailDiscount,
                artistId: seller,
                taxRateMillipercent,
                totals: retailTotals(items, parsedRetailDiscount, taxRateMillipercent),
            }
        }
    } else if (retailDiscount !== undefined || retailArtistId !== undefined) {
        return Response.json(
            { error: "retailDiscount and retailArtistId need retailItems" },
            { status: 400 },
        )
    }

    const retailDueCents = newRetail
        ? newRetail.totals.totalCents
        : existingSale
          ? savedSaleTotals(existingSale).totalCents
          : 0

    let newServices: ServiceToBook[] | null = null
    if (serviceIds !== undefined) {
        const resultingStatus = (status as AppointmentStatus | undefined) ?? appointment.status
        if (
            resultingStatus !== AppointmentStatus.PENDING &&
            resultingStatus !== AppointmentStatus.CONFIRMED
        ) {
            return Response.json(
                { error: "Only a PENDING or CONFIRMED appointment's services can be changed" },
                { status: 400 },
            )
        }

        const parsedIds = parseServiceIds(serviceIds)
        if (typeof parsedIds === "string") {
            return Response.json({ error: parsedIds }, { status: 400 })
        }

        const current = await loadServicesToBook(parsedIds)
        if (!current) {
            return Response.json({ error: "Service not found" }, { status: 404 })
        }

        newServices = current.map((service) => {
            const existing = appointment.services.find(
                (line) => line.serviceId === service.serviceId,
            )
            return existing
                ? {
                      serviceId: existing.serviceId,
                      priceCents: existing.priceCents,
                      durationMinutes: existing.durationMinutes,
                  }
                : service
        })

        if (durationMinutes === undefined && !servicesFitOneAppointment(newServices)) {
            return Response.json(
                { error: "Those services are too long for one appointment" },
                { status: 400 },
            )
        }
    }

    const priceCents = servicesPriceCents(newServices ?? appointment.services)

    let parsedDiscount: { type: DiscountType; value: number } | null | undefined = undefined
    if (discount !== undefined) {
        if (
            appointment.status !== AppointmentStatus.PENDING &&
            appointment.status !== AppointmentStatus.CONFIRMED
        ) {
            return Response.json(
                { error: "A discount can only be changed on a PENDING or CONFIRMED appointment" },
                { status: 400 },
            )
        }

        if (discount === null) {
            parsedDiscount = null
        } else {
            if (typeof discount !== "object") {
                return Response.json(
                    { error: "discount must be { type, value } or null" },
                    { status: 400 },
                )
            }

            const { type, value } = discount as Record<string, unknown>
            const problem = discountError({ type, value }, priceCents)
            if (problem) {
                return Response.json({ error: problem }, { status: 400 })
            }

            parsedDiscount = { type: type as DiscountType, value: value as number }
        }
    }

    const creditNowCents = (creditCents as number | undefined) ?? 0
    if (status === AppointmentStatus.COMPLETED) {
        const owedCents =
            totalCents(
                priceCents,
                parsedDiscount === undefined ? discountOf(appointment) : parsedDiscount,
            ) +
            retailDueCents -
            appointment.creditAppliedCents
        if (creditNowCents > Math.max(0, owedCents)) {
            return Response.json(
                { error: "That's more store credit than is owed" },
                { status: 400 },
            )
        }

        if (
            owedCents - creditNowCents > 0 &&
            (paymentMethod === undefined || paymentMethod === null)
        ) {
            return Response.json(
                {
                    error: "paymentMethod (CASH, CARD, GROUPON or OTHER) is required when something is still owed",
                },
                { status: 400 },
            )
        }
    }

    let parsedStartTime: Date | null = null
    if (startTime !== undefined) {
        const resultingStatus = (status as AppointmentStatus | undefined) ?? appointment.status
        if (
            resultingStatus !== AppointmentStatus.PENDING &&
            resultingStatus !== AppointmentStatus.CONFIRMED
        ) {
            return Response.json(
                { error: "Only a PENDING or CONFIRMED appointment can be rescheduled" },
                { status: 400 },
            )
        }

        if (typeof startTime !== "string" && typeof startTime !== "number") {
            return Response.json({ error: "startTime must be a date/time" }, { status: 400 })
        }

        const candidate = new Date(startTime)
        const isOnSlotGrid = isOnSlotBoundary(candidate)
        if (isNaN(candidate.getTime()) || !isOnSlotGrid) {
            return Response.json({ error: "startTime is invalid" }, { status: 400 })
        }

        parsedStartTime = candidate
    }

    let parsedDuration: number | null = null
    if (durationMinutes !== undefined) {
        const resultingStatus = (status as AppointmentStatus | undefined) ?? appointment.status
        if (
            resultingStatus !== AppointmentStatus.PENDING &&
            resultingStatus !== AppointmentStatus.CONFIRMED
        ) {
            return Response.json(
                { error: "Only a PENDING or CONFIRMED appointment's length can be changed" },
                { status: 400 },
            )
        }

        if (!isValidAppointmentLength(durationMinutes)) {
            return Response.json(
                {
                    error: `durationMinutes must be a multiple of 15, from 15 to ${MAX_APPOINTMENT_MINUTES}`,
                },
                { status: 400 },
            )
        }

        parsedDuration = durationMinutes
    }

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const data: Prisma.AppointmentUpdateInput = {}

            if (status !== undefined) {
                data.status = status as AppointmentStatus
            }

            if (status === AppointmentStatus.COMPLETED) {
                const unchanged = await tx.appointment.updateMany({
                    where: {
                        id,
                        status: appointment.status,
                        creditAppliedCents: appointment.creditAppliedCents,
                    },
                    data: { status: appointment.status },
                })
                if (unchanged.count === 0) throw new StaleCheckoutError()

                data.paymentMethod = (paymentMethod as PaymentMethod | null | undefined) ?? null
                data.checkedOutAt = new Date()

                await snapshotPayAtCheckout(tx, id, appointment.artistId)

                const method = (paymentMethod as PaymentMethod | null | undefined) ?? null
                if (newRetail) {
                    await createRetailSale(tx, {
                        items: newRetail.items,
                        soldAt: appointment.startTime,
                        userId: appointment.userId,
                        appointmentId: id,
                        artistId: newRetail.artistId,
                        discount: newRetail.discount,
                        taxRateMillipercent: newRetail.taxRateMillipercent,
                        taxCents: newRetail.totals.taxCents,
                        paymentMethod: method,
                        creditAppliedCents: 0,
                        createdById: adminId,
                    })
                } else if (existingSale) {
                    await tx.retailSale.update({
                        where: { id: existingSale.id },
                        data: { paymentMethod: method },
                    })
                }

                if (creditNowCents > 0) {
                    await spendCredit(tx, {
                        userId: appointment.userId,
                        amountCents: creditNowCents,
                        kind: "SPENT",
                        appointmentId: id,
                        createdById: adminId,
                    })
                    data.creditAppliedCents = { increment: creditNowCents }
                }
            }

            if (parsedDiscount !== undefined) {
                data.discountType = parsedDiscount?.type ?? null
                data.discountValue = parsedDiscount?.value ?? null
            }

            if (status === AppointmentStatus.CANCELLED || status === AppointmentStatus.NO_SHOW) {
                await tx.appointmentSlot.deleteMany({
                    where: { appointmentId: id },
                })
            }

            if (newServices) {
                await tx.appointmentService.deleteMany({ where: { appointmentId: id } })
                await tx.appointmentService.createMany({
                    data: newServices.map((service, position) => ({
                        ...service,
                        appointmentId: id,
                        position,
                    })),
                })
            }

            if (parsedStartTime || parsedDuration !== null || newServices) {
                const minutes =
                    parsedDuration ??
                    (newServices
                        ? servicesDurationMinutes(newServices)
                        : durationMinutesOf(appointment))

                const span = await reclaimSlots(tx, {
                    appointmentId: id,
                    artistId: appointment.artistId,
                    startTime: parsedStartTime ?? appointment.startTime,
                    durationMinutes: minutes,
                    allowPast: true,
                })

                data.startTime = span.startTime
                data.endTime = span.endTime
                if (parsedStartTime) {
                    data.reminderSentAt = null
                    data.smsReminderSentAt = null
                }
            }

            return tx.appointment.update({
                where: { id },
                data,
                include: SERVICE_LINES_INCLUDE,
            })
        })

        const { retailSales } = await prisma.appointment.findUniqueOrThrow({
            where: { id },
            select: LIVE_RETAIL_SALES_INCLUDE,
        })

        if (
            status === AppointmentStatus.CANCELLED &&
            appointment.status !== AppointmentStatus.CANCELLED
        ) {
            after(() => sendCancellationNotice(id, "salon"))
        }
        if (
            status === AppointmentStatus.COMPLETED &&
            appointment.status !== AppointmentStatus.COMPLETED
        ) {
            after(() => sendReceipt(id))
        }
        if (parsedStartTime && parsedStartTime.getTime() !== appointment.startTime.getTime()) {
            const previousStartTime = appointment.startTime
            after(() => sendRescheduleNotice(id, previousStartTime))
        }

        return Response.json({ data: { ...updated, retailSales } }, { status: 200 })
    } catch (error) {
        if (error instanceof StaleCheckoutError) {
            return Response.json(
                {
                    error: "This appointment was just changed (checked out on another screen?). Close this and check again.",
                },
                { status: 409 },
            )
        }

        if (error instanceof InsufficientCreditError) {
            return Response.json(
                {
                    error: "The customer's store credit balance has changed. Close this and check out again.",
                },
                { status: 409 },
            )
        }

        if (error instanceof SlotUnavailableError) {
            return Response.json(
                {
                    error: parsedStartTime
                        ? "That time is not available"
                        : newServices && parsedDuration === null
                          ? "There isn't enough open time after this appointment for those services"
                          : "There isn't enough open time after this appointment for that length",
                },
                { status: 400 },
            )
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return Response.json(
                { error: "That time was just booked, please pick another" },
                { status: 409 },
            )
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Appointment not found" }, { status: 404 })
        }

        throw error
    }
}
