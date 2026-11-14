import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireAdminId } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { requiredText, TEXT_LIMITS } from "@/lib/validation"
import { findRedeemableGiftCards, InvalidGiftCardError, redeemGiftCard } from "@/lib/gift-cards"
import { sendCreditAdded } from "@/lib/appointment-emails"

export async function GET(request: Request) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const name = requiredText(new URL(request.url).searchParams.get("name"), TEXT_LIMITS.personName)
    if (name === null || name.length < 2) {
        return Response.json(
            { error: "Enter at least 2 letters of the recipient's name" },
            { status: 400 },
        )
    }

    return Response.json({ data: await findRedeemableGiftCards(name) })
}

export async function POST(request: Request) {
    const adminId = await requireAdminId()
    if (adminId instanceof Response) return adminId

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    if (typeof body.userId !== "string") {
        return Response.json({ error: "userId is required" }, { status: 400 })
    }
    if (typeof body.giftCardId !== "string" || !body.giftCardId) {
        return Response.json({ error: "giftCardId is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true } })
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 })
    }

    try {
        const result = await redeemGiftCard({
            giftCardId: body.giftCardId,
            userId: user.id,
            actorId: adminId,
        })
        after(() => sendCreditAdded(user.id, result.addedCents))
        return Response.json({ data: result })
    } catch (error) {
        if (error instanceof InvalidGiftCardError) {
            return Response.json({ error: error.message }, { status: 409 })
        }
        throw error
    }
}
