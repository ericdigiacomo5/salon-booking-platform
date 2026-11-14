import { prisma } from "@/lib/prisma"
import { addCredit } from "@/lib/credit"
import { GIFT_CARD_SELECT } from "@/lib/credit-shared"

export const INVALID_GIFT_CARD_MESSAGE =
    "That gift certificate can't be redeemed — it may already have been used or voided. Search again."

export class InvalidGiftCardError extends Error {
    constructor() {
        super(INVALID_GIFT_CARD_MESSAGE)
        this.name = "InvalidGiftCardError"
    }
}

export async function issueGiftCard(args: {
    valueCents: number
    purchaserName: string | null
    recipientName: string
    issuedById: string
}) {
    const { id } = await prisma.giftCard.create({ data: args, select: { id: true } })
    return prisma.giftCard.findUniqueOrThrow({ where: { id }, select: GIFT_CARD_SELECT })
}

const SEARCH_LIMIT = 20

export async function findRedeemableGiftCards(query: string) {
    return prisma.giftCard.findMany({
        where: {
            status: "ISSUED",
            recipientName: { contains: query, mode: "insensitive" },
        },
        select: GIFT_CARD_SELECT,
        orderBy: { issuedAt: "asc" },
        take: SEARCH_LIMIT,
    })
}

export async function redeemGiftCard({
    giftCardId,
    userId,
    actorId,
}: {
    giftCardId: string
    userId: string
    actorId: string
}) {
    return prisma.$transaction(async (tx) => {
        const card = await tx.giftCard.findUnique({
            where: { id: giftCardId },
            select: { id: true, status: true, valueCents: true },
        })
        if (!card || card.status !== "ISSUED") throw new InvalidGiftCardError()

        const claimed = await tx.giftCard.updateMany({
            where: { id: card.id, status: "ISSUED" },
            data: { status: "REDEEMED", redeemedByUserId: userId, redeemedAt: new Date() },
        })
        if (claimed.count === 0) throw new InvalidGiftCardError()

        await addCredit(tx, {
            userId,
            amountCents: card.valueCents,
            kind: "GIFT_CARD",
            giftCardId: card.id,
            createdById: actorId,
        })

        const user = await tx.user.findUniqueOrThrow({
            where: { id: userId },
            select: { creditBalanceCents: true },
        })
        return { addedCents: card.valueCents, balanceCents: user.creditBalanceCents }
    })
}
