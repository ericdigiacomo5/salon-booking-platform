import type { CreditEntryKind, Prisma } from "@/generated/prisma/client"

type Tx = Prisma.TransactionClient

type EntryArgs = {
    userId: string
    amountCents: number
    kind: CreditEntryKind
    createdById: string
    giftCardId?: string
    appointmentId?: string
    retailSaleId?: string
    note?: string | null
}

export class InsufficientCreditError extends Error {
    constructor() {
        super("Insufficient store credit")
        this.name = "InsufficientCreditError"
    }
}

function assertPositiveCents(amountCents: number) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw new Error(
            `Credit amount must be a positive whole number of cents, got ${amountCents}`,
        )
    }
}

export async function addCredit(tx: Tx, { amountCents, ...entry }: EntryArgs) {
    assertPositiveCents(amountCents)
    await tx.user.update({
        where: { id: entry.userId },
        data: { creditBalanceCents: { increment: amountCents } },
    })
    return tx.creditEntry.create({ data: { ...entry, amountCents } })
}

export async function spendCredit(tx: Tx, { amountCents, ...entry }: EntryArgs) {
    assertPositiveCents(amountCents)
    const { count } = await tx.user.updateMany({
        where: { id: entry.userId, creditBalanceCents: { gte: amountCents } },
        data: { creditBalanceCents: { decrement: amountCents } },
    })
    if (count === 0) throw new InsufficientCreditError()
    return tx.creditEntry.create({ data: { ...entry, amountCents: -amountCents } })
}
