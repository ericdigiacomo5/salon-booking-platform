import { AppointmentStatus, RetailSaleStatus, type Prisma } from "@/generated/prisma/client"

type Tx = Prisma.TransactionClient

export const ARTIST_PAY_TERMS_INCLUDE = {
    payTerms: { select: { commissionBasisPoints: true } },
    retailPayTerms: { select: { commissionBasisPoints: true } },
} as const
export const SERVICE_PAY_TERMS_INCLUDE = {
    payTerms: { select: { serviceFeeCents: true } },
} as const

export async function setArtistCommission(tx: Tx, artistId: string, basisPoints: number | null) {
    if (basisPoints === null) {
        await tx.artistPayTerms.deleteMany({ where: { artistId } })
        return
    }

    await tx.artistPayTerms.upsert({
        where: { artistId },
        create: { artistId, commissionBasisPoints: basisPoints },
        update: { commissionBasisPoints: basisPoints },
    })

    const unrated = await tx.appointment.findMany({
        where: { artistId, status: AppointmentStatus.COMPLETED, pay: null },
        select: { id: true },
    })
    if (unrated.length > 0) {
        await tx.appointmentPay.createMany({
            data: unrated.map(({ id }) => ({
                appointmentId: id,
                commissionBasisPoints: basisPoints,
                backfilled: true,
            })),
            skipDuplicates: true,
        })
    }
}

export async function setArtistRetailCommission(
    tx: Tx,
    artistId: string,
    basisPoints: number | null,
) {
    if (basisPoints === null) {
        await tx.artistRetailPayTerms.deleteMany({ where: { artistId } })
        return
    }

    await tx.artistRetailPayTerms.upsert({
        where: { artistId },
        create: { artistId, commissionBasisPoints: basisPoints },
        update: { commissionBasisPoints: basisPoints },
    })

    const unrated = await tx.retailSale.findMany({
        where: { artistId, status: RetailSaleStatus.COMPLETED, pay: null },
        select: { id: true },
    })
    if (unrated.length > 0) {
        await tx.retailSalePay.createMany({
            data: unrated.map(({ id }) => ({
                retailSaleId: id,
                commissionBasisPoints: basisPoints,
                backfilled: true,
            })),
            skipDuplicates: true,
        })
    }
}

export async function snapshotRetailPay(tx: Tx, retailSaleId: string, artistId: string | null) {
    if (!artistId) return
    const terms = await tx.artistRetailPayTerms.findUnique({ where: { artistId } })
    if (!terms) return
    await tx.retailSalePay.createMany({
        data: [{ retailSaleId, commissionBasisPoints: terms.commissionBasisPoints }],
        skipDuplicates: true,
    })
}

export async function setServiceFee(tx: Tx, serviceId: string, feeCents: number) {
    if (feeCents === 0) {
        await tx.servicePayTerms.deleteMany({ where: { serviceId } })
        return
    }

    await tx.servicePayTerms.upsert({
        where: { serviceId },
        create: { serviceId, serviceFeeCents: feeCents },
        update: { serviceFeeCents: feeCents },
    })
}

export async function snapshotPayAtCheckout(tx: Tx, appointmentId: string, artistId: string) {
    const terms = await tx.artistPayTerms.findUnique({ where: { artistId } })
    const lines = await tx.appointmentService.findMany({
        where: { appointmentId, pay: null },
        select: {
            id: true,
            service: { select: { payTerms: { select: { serviceFeeCents: true } } } },
        },
    })

    if (terms) {
        await tx.appointmentPay.createMany({
            data: [{ appointmentId, commissionBasisPoints: terms.commissionBasisPoints }],
            skipDuplicates: true,
        })
    }

    if (lines.length > 0) {
        await tx.appointmentServicePay.createMany({
            data: lines.map((line) => ({
                appointmentServiceId: line.id,
                serviceFeeCents: line.service.payTerms?.serviceFeeCents ?? 0,
            })),
            skipDuplicates: true,
        })
    }
}
