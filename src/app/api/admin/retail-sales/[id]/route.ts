import { prisma } from "@/lib/prisma"
import { RetailSaleStatus } from "@/generated/prisma/client"
import { requireAdminId } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { requiredText } from "@/lib/validation"
import { addCredit } from "@/lib/credit"
import { CREDIT_NOTE_MAX } from "@/lib/credit-shared"
import { servicesPriceCents } from "@/lib/appointment-services"
import { discountOf, totalCents } from "@/lib/discount"
import { RETAIL_SALE_INCLUDE } from "@/lib/retail-data"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const adminId = await requireAdminId()
    if (adminId instanceof Response) return adminId

    const { id } = await params

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    if (body.status !== RetailSaleStatus.VOIDED) {
        return Response.json({ error: "A retail sale can only be voided" }, { status: 400 })
    }

    const reason = requiredText(body.reason, CREDIT_NOTE_MAX)
    if (reason === null) {
        return Response.json(
            { error: `A reason is required (up to ${CREDIT_NOTE_MAX} characters)` },
            { status: 400 },
        )
    }

    const sale = await prisma.retailSale.findUnique({
        where: { id },
        select: {
            status: true,
            userId: true,
            creditAppliedCents: true,
            appointment: {
                select: {
                    discountType: true,
                    discountValue: true,
                    creditAppliedCents: true,
                    services: { select: { priceCents: true } },
                },
            },
        },
    })
    if (!sale) {
        return Response.json({ error: "Retail sale not found" }, { status: 404 })
    }
    if (sale.status !== RetailSaleStatus.COMPLETED) {
        return Response.json({ error: "This sale is already voided" }, { status: 400 })
    }

    if (sale.appointment) {
        const servicesDue = totalCents(
            servicesPriceCents(sale.appointment.services),
            discountOf(sale.appointment),
        )
        if (sale.appointment.creditAppliedCents > servicesDue) {
            return Response.json(
                {
                    error: "Store credit on this visit paid for some of these products. Return the visit's store credit first (on the schedule), then void.",
                },
                { status: 409 },
            )
        }
    }

    const voided = await prisma.$transaction(async (tx) => {
        const { count } = await tx.retailSale.updateMany({
            where: { id, status: RetailSaleStatus.COMPLETED },
            data: {
                status: RetailSaleStatus.VOIDED,
                voidedAt: new Date(),
                voidedById: adminId,
                voidReason: reason,
                creditAppliedCents: 0,
            },
        })
        if (count === 0) return false

        if (sale.creditAppliedCents > 0 && sale.userId) {
            await addCredit(tx, {
                userId: sale.userId,
                amountCents: sale.creditAppliedCents,
                kind: "REVERSED",
                retailSaleId: id,
                note: `Sale voided: ${reason}`.slice(0, CREDIT_NOTE_MAX),
                createdById: adminId,
            })
        }

        return true
    })

    if (!voided) {
        return Response.json({ error: "This sale was just voided." }, { status: 409 })
    }

    const updated = await prisma.retailSale.findUniqueOrThrow({
        where: { id },
        include: RETAIL_SALE_INCLUDE,
    })

    return Response.json({ data: updated })
}
