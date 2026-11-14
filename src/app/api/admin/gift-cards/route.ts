import { prisma } from "@/lib/prisma"
import { requireAdmin, requireAdminId } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { optionalText, requiredText, TEXT_LIMITS } from "@/lib/validation"
import { issueGiftCard } from "@/lib/gift-cards"
import { GIFT_CARD_SELECT, MAX_GIFT_CARD_CENTS, MIN_GIFT_CARD_CENTS } from "@/lib/credit-shared"
import { formatPrice } from "@/lib/format"

export async function GET() {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const cards = await prisma.giftCard.findMany({
        select: GIFT_CARD_SELECT,
        orderBy: { issuedAt: "desc" },
    })

    return Response.json({ data: cards })
}

export async function POST(request: Request) {
    const adminId = await requireAdminId()
    if (adminId instanceof Response) return adminId

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { valueCents } = body
    if (
        typeof valueCents !== "number" ||
        !Number.isInteger(valueCents) ||
        valueCents < MIN_GIFT_CARD_CENTS ||
        valueCents > MAX_GIFT_CARD_CENTS
    ) {
        return Response.json(
            {
                error: `Value must be a whole number of cents from ${formatPrice(MIN_GIFT_CARD_CENTS)} to ${formatPrice(MAX_GIFT_CARD_CENTS)}`,
            },
            { status: 400 },
        )
    }

    const recipientName = requiredText(body.recipientName, TEXT_LIMITS.personName)
    if (recipientName === null || recipientName.length < 2) {
        return Response.json(
            {
                error: `The recipient's name is required (2 to ${TEXT_LIMITS.personName} characters) — it's how the certificate is redeemed`,
            },
            { status: 400 },
        )
    }

    const purchaserName = optionalText(body.purchaserName, TEXT_LIMITS.personName)
    if (!purchaserName.ok) {
        return Response.json(
            { error: `Names must be at most ${TEXT_LIMITS.personName} characters` },
            { status: 400 },
        )
    }

    const card = await issueGiftCard({
        valueCents,
        purchaserName: purchaserName.value ?? null,
        recipientName,
        issuedById: adminId,
    })

    return Response.json({ data: card }, { status: 201 })
}
