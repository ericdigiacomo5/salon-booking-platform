import { SITE_NAME } from "@/lib/site"

export const SMS_CONSENT_VERSION = "2026-10-22"

export const SMS_PROGRAM_NAME = `${SITE_NAME} appointment texts`

export const SMS_FREQUENCY = "about 2 messages per booking"

export const SMS_CONSENT_LABEL = `Text me appointment confirmations and reminders from ${SITE_NAME}.`

export const SMS_CONSENT_DETAILS =
    `Optional. We'll text you once to confirm — reply YES. Then ${SMS_FREQUENCY}, plus a text if one changes. ` +
    "Message and data rates may apply. Reply HELP for help or STOP to stop at any time. " +
    "Consent isn't a condition of booking. US mobile numbers only."

export const SMS_JOIN_KEYWORD = "JOIN"

export const SMS_JOIN_VERSION = "join-2026-10-28"

export function smsJoinHeadline(smsNumber: string): string {
    return `Text ${SMS_JOIN_KEYWORD} to ${smsNumber} for appointment texts from ${SITE_NAME}.`
}

export const SMS_JOIN_DETAILS =
    "Text from the mobile number the salon has on file for you. " +
    `You'll get booking confirmations and reminders, ${SMS_FREQUENCY}, plus a text if one changes. ` +
    "Optional: consent isn't a condition of booking. Message and data rates may apply. " +
    "Reply HELP for help or STOP to stop at any time. US mobile numbers only."

export type SmsStatus =
    | "off"
    | "stopped"
    | "waiting"
    | "on"

const STOP_WORDS = new Set([
    "STOP",
    "STOPALL",
    "UNSUBSCRIBE",
    "CANCEL",
    "END",
    "QUIT",
    "REVOKE",
    "OPTOUT",
])
const START_WORDS = new Set(["START", "YES", "Y", "UNSTOP"])

export function inboundKeyword(
    body: string,
    optOutType: string | null,
): "stop" | "start" | "help" | "join" | null {
    const type = optOutType?.toUpperCase()
    if (type === "STOP") return "stop"
    if (type === "START") return "start"
    if (type === "HELP") return "help"
    const word = body
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
    if (STOP_WORDS.has(word)) return "stop"
    if (START_WORDS.has(word)) return "start"
    if (word === "HELP" || word === "INFO") return "help"
    if (word === SMS_JOIN_KEYWORD) return "join"
    return null
}

export function smsStatusOf(user: {
    smsOptIn: boolean
    smsPhone: string | null
    smsConfirmedAt: Date | string | null
}): SmsStatus {
    if (!user.smsOptIn) return user.smsPhone ? "stopped" : "off"
    return user.smsConfirmedAt ? "on" : "waiting"
}

export function stoppedMessage(smsNumber: string | null): string {
    return `You replied STOP to our texts, so they're off. To turn them back on, text START to ${smsNumber ?? "the number our texts came from"}.`
}
