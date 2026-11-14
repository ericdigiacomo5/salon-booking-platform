import { prisma } from "@/lib/prisma"
import { RetailSaleStatus, type PaymentMethod, type Prisma } from "@/generated/prisma/client"
import { discountError, discountOf, type Discount } from "@/lib/discount"
import { snapshotRetailPay } from "@/lib/pay-terms"
import { clientShortName } from "@/lib/pay-report"
import type { RetailItemRequest } from "@/lib/retail"
import type { RetailReportSale } from "@/lib/retail-report"

type Tx = Prisma.TransactionClient

export type PreparedRetailItem = {
    productId: string
    productName: string
    quantity: number
    unitPriceCents: number
}

export async function prepareRetailItems(
    requests: RetailItemRequest[],
): Promise<PreparedRetailItem[] | null> {
    if (requests.length === 0) return []
    const products = await prisma.product.findMany({
        where: { id: { in: requests.map((item) => item.productId) }, active: true },
        select: { id: true, name: true, priceCents: true },
    })
    const prepared: PreparedRetailItem[] = []
    for (const request of requests) {
        const product = products.find((p) => p.id === request.productId)
        if (!product) return null
        prepared.push({
            productId: product.id,
            productName: product.name,
            quantity: request.quantity,
            unitPriceCents: product.priceCents,
        })
    }
    return prepared
}

export function parseRetailDiscount(
    value: unknown,
    subtotalCents: number,
): Discount | null | string {
    if (value === undefined || value === null) return null
    if (typeof value !== "object") return "The product discount must be { type, value } or null"
    const { type, value: amount } = value as Record<string, unknown>
    const problem = discountError({ type, value: amount }, subtotalCents)
    if (problem) return problem.replace("the service price", "the products' price")
    return { type: type as Discount["type"], value: amount as number }
}

export async function findSellingArtist(artistId: unknown): Promise<string | null | "missing"> {
    if (artistId === undefined || artistId === null || artistId === "") return null
    if (typeof artistId !== "string") return "missing"
    const artist = await prisma.artist.findUnique({
        where: { id: artistId },
        select: { id: true, active: true },
    })
    return artist?.active ? artist.id : "missing"
}

export async function createRetailSale(
    tx: Tx,
    sale: {
        items: PreparedRetailItem[]
        soldAt: Date
        userId: string | null
        appointmentId: string | null
        artistId: string | null
        discount: Discount | null
        taxRateMillipercent: number
        taxCents: number
        paymentMethod: PaymentMethod | null
        creditAppliedCents: number
        createdById: string
    },
) {
    const created = await tx.retailSale.create({
        data: {
            soldAt: sale.soldAt,
            userId: sale.userId,
            appointmentId: sale.appointmentId,
            artistId: sale.artistId,
            discountType: sale.discount?.type ?? null,
            discountValue: sale.discount?.value ?? null,
            taxRateMillipercent: sale.taxRateMillipercent,
            taxCents: sale.taxCents,
            paymentMethod: sale.paymentMethod,
            creditAppliedCents: sale.creditAppliedCents,
            createdById: sale.createdById,
        },
    })
    await tx.retailSaleItem.createMany({
        data: sale.items.map((item, position) => ({
            retailSaleId: created.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position,
        })),
    })
    await snapshotRetailPay(tx, created.id, sale.artistId)
    return created
}

export const RETAIL_SALE_INCLUDE = {
    items: {
        orderBy: { position: "asc" },
        select: {
            productId: true,
            quantity: true,
            unitPriceCents: true,
            product: { select: { name: true } },
        },
    },
    artist: { select: { id: true, name: true } },
    user: { select: { id: true, name: true, email: true } },
    createdBy: { select: { name: true, email: true } },
    voidedBy: { select: { name: true, email: true } },
} as const satisfies Prisma.RetailSaleInclude

export type RetailSaleRow = Prisma.RetailSaleGetPayload<{ include: typeof RETAIL_SALE_INCLUDE }>

export const LIVE_RETAIL_SALES_INCLUDE = {
    retailSales: { where: { status: RetailSaleStatus.COMPLETED }, include: RETAIL_SALE_INCLUDE },
} as const satisfies Prisma.AppointmentInclude

export async function loadRetailReportSales({
    from,
    to,
    artistId,
}: {
    from: Date
    to: Date
    artistId: string | "all"
}): Promise<RetailReportSale[]> {
    const sales = await prisma.retailSale.findMany({
        where: {
            status: RetailSaleStatus.COMPLETED,
            soldAt: { gte: from, lte: to },
            ...(artistId === "all" ? {} : { artistId }),
        },
        select: {
            id: true,
            soldAt: true,
            artistId: true,
            appointmentId: true,
            discountType: true,
            discountValue: true,
            taxRateMillipercent: true,
            taxCents: true,
            paymentMethod: true,
            creditAppliedCents: true,
            user: { select: { name: true } },
            pay: { select: { commissionBasisPoints: true, backfilled: true } },
            items: {
                orderBy: { position: "asc" },
                select: {
                    productId: true,
                    quantity: true,
                    unitPriceCents: true,
                    product: { select: { name: true } },
                },
            },
        },
        orderBy: { soldAt: "asc" },
    })

    return sales.map((sale) => ({
        id: sale.id,
        soldAt: sale.soldAt,
        artistId: sale.artistId,
        appointmentId: sale.appointmentId,
        clientName: clientShortName(sale.user?.name ?? null),
        discount: discountOf(sale),
        taxRateMillipercent: sale.taxRateMillipercent,
        taxCents: sale.taxCents,
        paymentMethod: sale.paymentMethod,
        creditAppliedCents: sale.creditAppliedCents,
        commissionBasisPoints: sale.pay?.commissionBasisPoints ?? null,
        commissionBackfilled: sale.pay?.backfilled ?? false,
        items: sale.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
        })),
    }))
}
