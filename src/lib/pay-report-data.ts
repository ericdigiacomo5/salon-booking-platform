import { prisma } from "@/lib/prisma"
import { AppointmentStatus } from "@/generated/prisma/client"
import { discountOf } from "@/lib/discount"
import { clientShortName, type PayReportVisit } from "@/lib/pay-report"

export async function loadPayReportVisits({
    from,
    to,
    artistId,
}: {
    from: Date
    to: Date
    artistId: string | null
}): Promise<PayReportVisit[]> {
    const appointments = await prisma.appointment.findMany({
        where: {
            status: AppointmentStatus.COMPLETED,
            startTime: { gte: from, lte: to },
            ...(artistId ? { artistId } : {}),
        },
        select: {
            id: true,
            artistId: true,
            startTime: true,
            createdAt: true,
            discountType: true,
            discountValue: true,
            paymentMethod: true,
            creditAppliedCents: true,
            user: { select: { name: true } },
            pay: { select: { commissionBasisPoints: true, backfilled: true } },
            services: {
                orderBy: { position: "asc" },
                select: {
                    serviceId: true,
                    priceCents: true,
                    service: {
                        select: {
                            name: true,
                            category: { select: { id: true, name: true, position: true } },
                        },
                    },
                    pay: { select: { serviceFeeCents: true } },
                },
            },
        },
        orderBy: { startTime: "asc" },
    })

    return appointments.map((appointment) => ({
        id: appointment.id,
        artistId: appointment.artistId,
        startTime: appointment.startTime,
        createdAt: appointment.createdAt,
        clientName: clientShortName(appointment.user.name),
        discount: discountOf(appointment),
        paymentMethod: appointment.paymentMethod,
        creditAppliedCents: appointment.creditAppliedCents,
        commissionBasisPoints: appointment.pay?.commissionBasisPoints ?? null,
        commissionBackfilled: appointment.pay?.backfilled ?? false,
        lines: appointment.services.map((line) => ({
            serviceId: line.serviceId,
            serviceName: line.service.name,
            category: line.service.category,
            priceCents: line.priceCents,
            serviceFeeCents: line.pay?.serviceFeeCents ?? 0,
        })),
    }))
}

export async function loadPayReportArtists() {
    return prisma.artist.findMany({
        select: { id: true, name: true, active: true },
        orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    })
}
