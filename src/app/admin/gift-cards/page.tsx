import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { GIFT_CARD_SELECT } from "@/lib/credit-shared"
import { AdminGiftCardsManager } from "@/components/admin/gift-cards/admin-gift-cards-manager"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Gift Cards" }

export default async function AdminGiftCardsPage() {
    await requireAdminPage("/admin/gift-cards")

    const [cards, credit] = await Promise.all([
        prisma.giftCard.findMany({ select: GIFT_CARD_SELECT, orderBy: { issuedAt: "desc" } }),
        prisma.user.aggregate({ _sum: { creditBalanceCents: true } }),
    ])

    return (
        <AdminGiftCardsManager
            initialCards={cards}
            customerCreditCents={credit._sum.creditBalanceCents ?? 0}
        />
    )
}
