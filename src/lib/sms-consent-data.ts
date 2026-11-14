import { prisma } from "@/lib/prisma"
import { toUsE164 } from "@/lib/validation"
import { SMS_CONSENT_VERSION, SMS_JOIN_VERSION } from "@/lib/sms-consent"

export type SmsOptInSource = "register" | "account"
export type SmsOptOutSource = "account" | "sms_reply" | "phone_changed" | "carrier"

const FORGET_FIELDS = {
    smsOptIn: false,
    smsPhone: null,
    smsConfirmedAt: null,
    smsConfirmRequestedAt: null,
} as const
const STOPPED_FIELDS = {
    smsOptIn: false,
    smsConfirmedAt: null,
    smsConfirmRequestedAt: null,
} as const

export type OptInResult =
    | { ok: true; alreadyOn: boolean }
    | { ok: false; reason: "no_phone" | "not_found" | "stopped" }

export async function optInToSms(userId: string, source: SmsOptInSource): Promise<OptInResult> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, smsOptIn: true, smsPhone: true, smsConfirmedAt: true },
    })
    if (!user) return { ok: false, reason: "not_found" }

    const phone = toUsE164(user.phone)
    if (!phone) return { ok: false, reason: "no_phone" }

    if (user.smsPhone === phone) {
        if (user.smsOptIn) return { ok: true, alreadyOn: user.smsConfirmedAt !== null }
        return { ok: false, reason: "stopped" }
    }

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                smsOptIn: true,
                smsPhone: phone,
                smsConfirmedAt: null,
                smsConfirmRequestedAt: null,
            },
        }),
        prisma.smsConsentEvent.create({
            data: {
                userId,
                phone,
                action: "OPTED_IN",
                source,
                disclosureVersion: SMS_CONSENT_VERSION,
            },
        }),
    ])
    return { ok: true, alreadyOn: false }
}

export async function optOutOfSms(
    userId: string,
    source: Extract<SmsOptOutSource, "account" | "phone_changed">,
): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { smsOptIn: true, smsPhone: true },
    })
    if (!user?.smsPhone) return

    if (!user.smsOptIn) {
        await prisma.user.update({ where: { id: userId }, data: FORGET_FIELDS })
        return
    }
    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: FORGET_FIELDS }),
        prisma.smsConsentEvent.create({
            data: { userId, phone: user.smsPhone, action: "OPTED_OUT", source },
        }),
    ])
}

export async function syncSmsWithPhone(userId: string, newPhone: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { smsPhone: true } })
    if (user?.smsPhone && toUsE164(newPhone) !== user.smsPhone) {
        await optOutOfSms(userId, "phone_changed")
    }
}

export async function optOutPhone(
    phone: string,
    source: Extract<SmsOptOutSource, "sms_reply" | "carrier">,
): Promise<number> {
    const users = await prisma.user.findMany({
        where: { smsPhone: phone, smsOptIn: true },
        select: { id: true },
    })
    let stopped = 0
    for (const { id } of users) {
        await prisma.$transaction(async (tx) => {
            const changed = await tx.user.updateMany({
                where: { id, smsPhone: phone, smsOptIn: true },
                data: STOPPED_FIELDS,
            })
            if (changed.count === 0) return
            await tx.smsConsentEvent.create({
                data: { userId: id, phone, action: "OPTED_OUT", source },
            })
            stopped++
        })
    }
    return stopped
}

export async function confirmPhone(phone: string): Promise<number> {
    const users = await prisma.user.findMany({
        where: { smsPhone: phone, smsConfirmedAt: null },
        select: { id: true, smsOptIn: true },
    })
    const now = new Date()
    let confirmed = 0
    for (const { id, smsOptIn: waiting } of users) {
        await prisma.$transaction(async (tx) => {
            const changed = await tx.user.updateMany({
                where: { id, smsPhone: phone, smsOptIn: waiting, smsConfirmedAt: null },
                data: { smsOptIn: true, smsConfirmedAt: now },
            })
            if (changed.count === 0) return
            if (!waiting) {
                await tx.smsConsentEvent.create({
                    data: { userId: id, phone, action: "OPTED_IN", source: "sms_reply" },
                })
            }
            await tx.smsConsentEvent.create({
                data: { userId: id, phone, action: "CONFIRMED", source: "sms_reply" },
            })
            confirmed++
        })
    }
    return confirmed
}

export type JoinResult = {
    joined: number
    alreadyOn: number
    stopped: number
}

export async function joinByKeyword(phone: string): Promise<JoinResult> {
    const result: JoinResult = { joined: 0, alreadyOn: 0, stopped: 0 }
    const digits = phone.replace(/^\+1/, "")
    if (toUsE164(digits) !== phone) return result

    const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "User"
        WHERE right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = ${digits}`
    if (rows.length === 0) return result

    const users = await prisma.user.findMany({
        where: { id: { in: rows.map((row) => row.id) } },
        select: { id: true, phone: true, smsOptIn: true, smsPhone: true, smsConfirmedAt: true },
    })
    const now = new Date()
    for (const user of users) {
        if (toUsE164(user.phone) !== phone) continue
        if (user.smsPhone === phone && !user.smsOptIn) {
            result.stopped++
            continue
        }
        if (user.smsPhone === phone && user.smsConfirmedAt) {
            result.alreadyOn++
            continue
        }
        const waiting = user.smsOptIn && user.smsPhone === phone
        await prisma.$transaction(async (tx) => {
            const changed = await tx.user.updateMany({
                where: {
                    id: user.id,
                    phone: user.phone,
                    smsOptIn: user.smsOptIn,
                    smsPhone: user.smsPhone,
                    smsConfirmedAt: null,
                },
                data: {
                    smsOptIn: true,
                    smsPhone: phone,
                    smsConfirmedAt: now,
                    smsConfirmRequestedAt: null,
                },
            })
            if (changed.count === 0) return
            if (!waiting) {
                await tx.smsConsentEvent.create({
                    data: {
                        userId: user.id,
                        phone,
                        action: "OPTED_IN",
                        source: "sms_keyword",
                        disclosureVersion: SMS_JOIN_VERSION,
                    },
                })
            }
            await tx.smsConsentEvent.create({
                data: { userId: user.id, phone, action: "CONFIRMED", source: "sms_keyword" },
            })
            result.joined++
        })
    }
    return result
}
