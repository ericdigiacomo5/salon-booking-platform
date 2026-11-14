import type { CreditEntryKind, GiftCardStatus } from "@/generated/prisma/client"
import { formatSalonDate } from "@/lib/salon-time"

export const CREDIT_KIND_LABEL: Record<CreditEntryKind, string> = {
    GIFT_CARD: "Gift card",
    SPENT: "Used at checkout",
    REVERSED: "Returned from checkout",
    ADJUSTMENT: "Adjustment",
}

export const GIFT_CARD_STATUS_LABEL: Record<GiftCardStatus, string> = {
    ISSUED: "Not redeemed",
    REDEEMED: "Redeemed",
    VOID: "Void",
}

export const CREDIT_ENTRY_SELECT = {
    id: true,
    amountCents: true,
    kind: true,
    note: true,
    createdAt: true,
    appointment: { select: { id: true, startTime: true } },
    retailSale: { select: { id: true, soldAt: true } },
    giftCard: { select: { codeLast4: true, recipientName: true } },
} as const

export const ADMIN_CREDIT_ENTRY_SELECT = {
    ...CREDIT_ENTRY_SELECT,
    createdBy: { select: { name: true, email: true } },
} as const

export type CreditEntryRow = {
    id: string
    amountCents: number
    kind: CreditEntryKind
    note: string | null
    createdAt: Date | string
    appointment: { id: string; startTime: Date | string } | null
    retailSale: { id: string; soldAt: Date | string } | null
    giftCard: { codeLast4: string | null; recipientName: string | null } | null
    createdBy?: { name: string | null; email: string }
}

export const GIFT_CARD_SELECT = {
    id: true,
    codeLast4: true,
    valueCents: true,
    status: true,
    purchaserName: true,
    recipientName: true,
    issuedAt: true,
    redeemedAt: true,
    voidedAt: true,
    voidReason: true,
    issuedBy: { select: { name: true, email: true } },
    redeemedBy: { select: { id: true, name: true, email: true } },
    voidedBy: { select: { name: true, email: true } },
} as const

export type GiftCardRow = {
    id: string
    codeLast4: string | null
    valueCents: number
    status: GiftCardStatus
    purchaserName: string | null
    recipientName: string | null
    issuedAt: Date | string
    redeemedAt: Date | string | null
    voidedAt: Date | string | null
    voidReason: string | null
    issuedBy: { name: string | null; email: string }
    redeemedBy: { id: string; name: string | null; email: string } | null
    voidedBy: { name: string | null; email: string } | null
}

export const CREDIT_NOTE_MAX = 300

export const MIN_GIFT_CARD_CENTS = 100
export const MAX_GIFT_CARD_CENTS = 100_000

export function describeCreditEntry(entry: CreditEntryRow): string {
    const label = CREDIT_KIND_LABEL[entry.kind]
    if (entry.kind === "GIFT_CARD" && entry.giftCard) {
        if (entry.giftCard.recipientName) return `${label} for ${entry.giftCard.recipientName}`
        if (entry.giftCard.codeLast4) return `${label} ending ${entry.giftCard.codeLast4}`
    }
    if (entry.appointment) {
        const when = formatSalonDate(entry.appointment.startTime, {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        return `${label} (visit on ${when})`
    }
    if (entry.retailSale) {
        const when = formatSalonDate(entry.retailSale.soldAt, {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
        return `${label} (products bought on ${when})`
    }
    return label
}
