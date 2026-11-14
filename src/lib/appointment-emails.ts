import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { errorMessage, reportError } from "@/lib/report-error"
import {
    appointmentCancelledEmail,
    appointmentReminderEmail,
    appointmentRescheduledEmail,
    bookingConfirmationEmail,
    creditAddedEmail,
    receiptEmail,
    recurringConfirmationEmail,
    recurringCancelledEmail,
    type AppointmentEmailDetails,
} from "@/lib/email-templates"
import { PAYMENT_METHOD_LABEL } from "@/components/admin/appointment-shared"
import { discountOf } from "@/lib/discount"
import { savedSaleTotals } from "@/lib/retail"
import { durationMinutesOf } from "@/lib/schedule-grid"
import {
    SERVICE_LINES_INCLUDE,
    servicesLabel,
    servicesPriceCents,
} from "@/lib/appointment-services"
import { getPolicySettings } from "@/lib/settings"
import {
    textBookingConfirmation,
    textCancellationNotice,
    textRecurringCancelledNotice,
    textRecurringConfirmation,
    textRescheduleNotice,
} from "@/lib/appointment-sms"

const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000

const CUSTOMER_SELECT = {
    name: true,
    email: true,
    emailVerified: true,
    passwordHash: true,
} as const

const APPOINTMENT_INCLUDE = {
    user: { select: CUSTOMER_SELECT },
    artist: { select: { name: true } },
    ...SERVICE_LINES_INCLUDE,
} as const

type CustomerRow = {
    name: string | null
    emailVerified: Date | null
    passwordHash: string | null
}

function canSignIn(user: CustomerRow): boolean {
    return user.passwordHash !== null
}

function mayEmail(user: CustomerRow): boolean {
    return user.emailVerified !== null || !canSignIn(user)
}

function customerLinks(user: CustomerRow): { manageUrl: string | null } {
    if (!canSignIn(user)) return { manageUrl: null }

    return { manageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/appointments` }
}

async function loadAppointment(appointmentId: string) {
    return prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: APPOINTMENT_INCLUDE,
    })
}

async function noticeHours(): Promise<number> {
    return (await getPolicySettings()).cancellationNoticeHours
}

type LoadedAppointment = NonNullable<Awaited<ReturnType<typeof loadAppointment>>>

function toDetails(
    appointment: LoadedAppointment,
    cancellationNoticeHours: number,
): AppointmentEmailDetails {
    return {
        cancellationNoticeHours,
        customerName: appointment.user.name,
        serviceName: servicesLabel(appointment.services),
        artistName: appointment.artist.name,
        startTime: appointment.startTime,
        durationMinutes: durationMinutesOf(appointment),
        priceCents: servicesPriceCents(appointment.services),
        discount: discountOf(appointment),
        ...customerLinks(appointment.user),
    }
}

function isInPast(date: Date): boolean {
    return date.getTime() < Date.now()
}

function isWithinReminderWindow(date: Date): boolean {
    return date.getTime() - Date.now() <= REMINDER_WINDOW_MS
}

async function markReminderCoveredIfImminent(appointmentId: string, startTime: Date) {
    if (!isWithinReminderWindow(startTime)) return
    await prisma.appointment.updateMany({
        where: { id: appointmentId, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
    })
}

async function safely(label: string, fn: () => Promise<void>) {
    try {
        await fn()
    } catch (error) {
        await reportError({ event: "email_failed", message: `${label}: ${errorMessage(error)}` })
    }
}

function alongside(email: Promise<void>, text: Promise<void>): Promise<void> {
    return Promise.all([email, text]).then(() => undefined)
}

export function sendBookingConfirmation(appointmentId: string) {
    return alongside(
        sendBookingConfirmationEmail(appointmentId),
        textBookingConfirmation(appointmentId),
    )
}

function sendBookingConfirmationEmail(appointmentId: string) {
    return safely("booking confirmation", async () => {
        const appointment = await loadAppointment(appointmentId)
        if (!appointment || isInPast(appointment.startTime) || !mayEmail(appointment.user)) return

        const { ok } = await sendEmail({
            to: appointment.user.email,
            ...bookingConfirmationEmail(toDetails(appointment, await noticeHours())),
        })
        if (ok) await markReminderCoveredIfImminent(appointment.id, appointment.startTime)
    })
}

export function sendRescheduleNotice(appointmentId: string, previousStartTime: Date) {
    return alongside(
        sendRescheduleEmail(appointmentId, previousStartTime),
        textRescheduleNotice(appointmentId),
    )
}

function sendRescheduleEmail(appointmentId: string, previousStartTime: Date) {
    return safely("reschedule notice", async () => {
        const appointment = await loadAppointment(appointmentId)
        if (!appointment || isInPast(appointment.startTime) || !mayEmail(appointment.user)) return

        const { ok } = await sendEmail({
            to: appointment.user.email,
            ...appointmentRescheduledEmail({
                ...toDetails(appointment, await noticeHours()),
                previousStartTime,
            }),
        })
        if (ok) await markReminderCoveredIfImminent(appointment.id, appointment.startTime)
    })
}

export function sendCancellationNotice(appointmentId: string, cancelledBy: "customer" | "salon") {
    return alongside(
        sendCancellationEmail(appointmentId, cancelledBy),
        textCancellationNotice(appointmentId, cancelledBy),
    )
}

function sendCancellationEmail(appointmentId: string, cancelledBy: "customer" | "salon") {
    return safely("cancellation notice", async () => {
        const appointment = await loadAppointment(appointmentId)
        if (!appointment || isInPast(appointment.startTime) || !mayEmail(appointment.user)) return

        await sendEmail({
            to: appointment.user.email,
            ...appointmentCancelledEmail({
                ...toDetails(appointment, await noticeHours()),
                cancelledBy,
            }),
        })
    })
}

export function sendReceipt(appointmentId: string) {
    return safely("receipt", async () => {
        const appointment = await loadAppointment(appointmentId)
        if (!appointment || !appointment.checkedOutAt || !mayEmail(appointment.user)) return

        const sale = await prisma.retailSale.findFirst({
            where: { appointmentId, status: "COMPLETED" },
            select: {
                discountType: true,
                discountValue: true,
                taxCents: true,
                items: {
                    orderBy: { position: "asc" },
                    select: {
                        quantity: true,
                        unitPriceCents: true,
                        product: { select: { name: true } },
                    },
                },
            },
        })
        const saleTotals = sale ? savedSaleTotals(sale) : null

        await sendEmail({
            to: appointment.user.email,
            ...receiptEmail({
                ...toDetails(appointment, await noticeHours()),
                paymentMethodLabel: appointment.paymentMethod
                    ? PAYMENT_METHOD_LABEL[appointment.paymentMethod]
                    : null,
                creditAppliedCents: appointment.creditAppliedCents,
                checkedOutAt: appointment.checkedOutAt,
                products:
                    sale && saleTotals
                        ? {
                              lines: sale.items.map((item) =>
                                  item.quantity > 1
                                      ? `${item.product.name} ×${item.quantity}`
                                      : item.product.name,
                              ),
                              netCents: saleTotals.netCents,
                              taxCents: saleTotals.taxCents,
                          }
                        : null,
            }),
        })
    })
}

export function sendCreditAdded(userId: string, addedCents: number) {
    return safely("credit added", async () => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { ...CUSTOMER_SELECT, creditBalanceCents: true },
        })
        if (!user || !mayEmail(user)) return

        const { manageUrl } = customerLinks(user)
        await sendEmail({
            to: user.email,
            ...creditAddedEmail({
                customerName: user.name,
                addedCents,
                balanceCents: user.creditBalanceCents,
                accountUrl: manageUrl ? `${process.env.NEXT_PUBLIC_APP_URL}/account` : null,
            }),
        })
    })
}

export function sendRecurringConfirmation(
    recurringAppointmentId: string,
    createdAppointmentIds: string[],
    skippedStartTimes: Date[],
) {
    return alongside(
        sendRecurringConfirmationEmail(
            recurringAppointmentId,
            createdAppointmentIds,
            skippedStartTimes,
        ),
        textRecurringConfirmation(recurringAppointmentId, createdAppointmentIds),
    )
}

function sendRecurringConfirmationEmail(
    recurringAppointmentId: string,
    createdAppointmentIds: string[],
    skippedStartTimes: Date[],
) {
    return safely("recurring confirmation", async () => {
        const [series, occurrences] = await Promise.all([
            loadSeries(recurringAppointmentId),
            prisma.appointment.findMany({
                where: { id: { in: createdAppointmentIds } },
                select: { id: true, startTime: true },
                orderBy: { startTime: "asc" },
            }),
        ])
        if (!series || !mayEmail(series.user)) return

        const upcoming = occurrences.filter((o) => !isInPast(o.startTime))
        if (upcoming.length === 0) return

        const { ok } = await sendEmail({
            to: series.user.email,
            ...recurringConfirmationEmail({
                ...seriesDetails(series),
                occurrences: upcoming.map((o) => o.startTime),
                skippedDates: skippedStartTimes.filter((d) => !isInPast(d)),
            }),
        })
        if (ok) {
            for (const o of upcoming) await markReminderCoveredIfImminent(o.id, o.startTime)
        }
    })
}

export function sendRecurringCancelledNotice(
    recurringAppointmentId: string,
    changedBy: "customer" | "salon",
    cancelledAppointmentIds: string[],
) {
    return alongside(
        sendRecurringCancelledEmail(recurringAppointmentId, changedBy, cancelledAppointmentIds),
        textRecurringCancelledNotice(recurringAppointmentId, cancelledAppointmentIds),
    )
}

function sendRecurringCancelledEmail(
    recurringAppointmentId: string,
    changedBy: "customer" | "salon",
    cancelledAppointmentIds: string[],
) {
    return safely("recurring cancelled notice", async () => {
        const [series, cancelled] = await Promise.all([
            loadSeries(recurringAppointmentId),
            prisma.appointment.findMany({
                where: { id: { in: cancelledAppointmentIds } },
                select: { startTime: true },
                orderBy: { startTime: "asc" },
            }),
        ])
        if (!series || !mayEmail(series.user)) return

        await sendEmail({
            to: series.user.email,
            ...recurringCancelledEmail({
                ...seriesDetails(series),
                changedBy,
                cancelledOccurrences: cancelled.map((a) => a.startTime),
            }),
        })
    })
}

async function loadSeries(recurringAppointmentId: string) {
    return prisma.recurringAppointment.findUnique({
        where: { id: recurringAppointmentId },
        include: {
            user: { select: CUSTOMER_SELECT },
            artist: { select: { name: true } },
            ...SERVICE_LINES_INCLUDE,
        },
    })
}

function seriesDetails(series: NonNullable<Awaited<ReturnType<typeof loadSeries>>>) {
    return {
        customerName: series.user.name,
        serviceName: servicesLabel(series.services),
        artistName: series.artist.name,
        intervalWeeks: series.intervalWeeks,
        manageUrl: customerLinks(series.user).manageUrl,
    }
}

export type ReminderRunResult = { considered: number; sent: number; failed: number }

export async function sendDueReminders(): Promise<ReminderRunResult> {
    const now = new Date()
    const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS)

    const due = await prisma.appointment.findMany({
        where: {
            status: { in: ["PENDING", "CONFIRMED"] },
            reminderSentAt: null,
            startTime: { gt: now, lte: windowEnd },
        },
        include: APPOINTMENT_INCLUDE,
        orderBy: { startTime: "asc" },
    })

    let sent = 0
    let failed = 0
    const cancellationNoticeHours = await noticeHours()

    for (const appointment of due) {
        if (!mayEmail(appointment.user)) continue

        const claimed = await prisma.appointment.updateMany({
            where: { id: appointment.id, reminderSentAt: null },
            data: { reminderSentAt: now },
        })
        if (claimed.count === 0) continue

        const { ok } = await sendEmail({
            to: appointment.user.email,
            ...appointmentReminderEmail(toDetails(appointment, cancellationNoticeHours)),
        })

        if (ok) {
            sent++
        } else {
            failed++
            await prisma.appointment.updateMany({
                where: { id: appointment.id, reminderSentAt: now },
                data: { reminderSentAt: null },
            })
        }
    }

    return { considered: due.length, sent, failed }
}
