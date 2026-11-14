import { prisma } from "@/lib/prisma"
import { PaymentMethod } from "@/generated/prisma/client"
import { requireAdminId } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { InsufficientCreditError, spendCredit } from "@/lib/credit"
import { getRetailTaxRate } from "@/lib/settings"
import { parseRetailItems, retailSubtotalCents, retailTotals } from "@/lib/retail"
import {
    createRetailSale,
    findSellingArtist,
    parseRetailDiscount,
    prepareRetailItems,
    RETAIL_SALE_INCLUDE,
} from "@/lib/retail-data"

export async function POST(request: Request) {
    const adminId = await requireAdminId()
    if (adminId instanceof Response) return adminId

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const requests = parseRetailItems(body.items)
    if (typeof requests === "string") {
        return Response.json({ error: requests }, { status: 400 })
    }
    if (requests.length === 0) {
        return Response.json({ error: "Add at least one product" }, { status: 400 })
    }

    const { paymentMethod, creditCents } = body
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

    const credit = creditCents ?? 0
    if (typeof credit !== "number" || !Number.isInteger(credit) || credit < 0) {
        return Response.json(
            { error: "creditCents must be a whole number of cents, 0 or more" },
            { status: 400 },
        )
    }

    let userId: string | null = null
    if (body.userId !== undefined && body.userId !== null && body.userId !== "") {
        if (typeof body.userId !== "string") {
            return Response.json({ error: "User not found" }, { status: 404 })
        }
        const user = await prisma.user.findUnique({
            where: { id: body.userId },
            select: { id: true },
        })
        if (!user) {
            return Response.json({ error: "User not found" }, { status: 404 })
        }
        userId = user.id
    }
    if (credit > 0 && !userId) {
        return Response.json(
            { error: "Choose the customer to use their store credit" },
            { status: 400 },
        )
    }

    const artistId = await findSellingArtist(body.artistId)
    if (artistId === "missing") {
        return Response.json({ error: "Artist not found" }, { status: 404 })
    }

    const items = await prepareRetailItems(requests)
    if (!items) {
        return Response.json({ error: "Product not found" }, { status: 404 })
    }

    const discount = parseRetailDiscount(body.discount, retailSubtotalCents(items))
    if (typeof discount === "string") {
        return Response.json({ error: discount }, { status: 400 })
    }

    const taxRateMillipercent = await getRetailTaxRate()
    const totals = retailTotals(items, discount, taxRateMillipercent)

    if (credit > totals.totalCents) {
        return Response.json({ error: "That's more store credit than is owed" }, { status: 400 })
    }
    if (totals.totalCents - credit > 0 && (paymentMethod === undefined || paymentMethod === null)) {
        return Response.json(
            {
                error: "paymentMethod (CASH, CARD, GROUPON or OTHER) is required when something is still owed",
            },
            { status: 400 },
        )
    }

    try {
        const saleId = await prisma.$transaction(async (tx) => {
            const created = await createRetailSale(tx, {
                items,
                soldAt: new Date(),
                userId,
                appointmentId: null,
                artistId,
                discount,
                taxRateMillipercent,
                taxCents: totals.taxCents,
                paymentMethod: (paymentMethod as PaymentMethod | null | undefined) ?? null,
                creditAppliedCents: credit,
                createdById: adminId,
            })
            if (credit > 0 && userId) {
                await spendCredit(tx, {
                    userId,
                    amountCents: credit,
                    kind: "SPENT",
                    retailSaleId: created.id,
                    createdById: adminId,
                })
            }
            return created.id
        })

        const sale = await prisma.retailSale.findUniqueOrThrow({
            where: { id: saleId },
            include: RETAIL_SALE_INCLUDE,
        })

        return Response.json({ data: sale }, { status: 201 })
    } catch (error) {
        if (error instanceof InsufficientCreditError) {
            return Response.json(
                { error: "The customer's store credit balance doesn't cover that." },
                { status: 409 },
            )
        }
        throw error
    }
}
