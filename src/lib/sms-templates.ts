import { BOOKING_PHONE, SITE_NAME, formatPhone } from "@/lib/site"
import { formatSalonDate, formatSalonTime, zonedParts } from "@/lib/salon-time"
import { SMS_FREQUENCY } from "@/lib/sms-consent"

const OPT_OUT = "Reply STOP to opt out."

const GSM_BASIC =
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
const GSM_EXTENDED = "^{}\\[~]|€"

const REPLACEMENTS: Record<string, string> = {
    " ": " ",
    " ": " ",
    " ": " ",
    "‘": "'",
    "’": "'",
    "“": '"',
    "”": '"',
    "–": "-",
    "—": "-",
    "…": "...",
}

export function toGsm7(text: string): string {
    let result = ""
    for (const char of text) {
        const replaced = REPLACEMENTS[char] ?? char
        for (const c of replaced) {
            if (GSM_BASIC.includes(c) || GSM_EXTENDED.includes(c)) {
                result += c
                continue
            }
            const plain = c.normalize("NFD").replace(/[̀-ͯ]/g, "")
            if (plain.length > 0 && [...plain].every((p) => GSM_BASIC.includes(p))) result += plain
        }
    }
    return result.replace(/ {2,}/g, " ").trim()
}

export function gsm7Segments(text: string): number {
    const length = [...text].reduce((sum, c) => sum + (GSM_EXTENDED.includes(c) ? 2 : 1), 0)
    return length <= 160 ? 1 : Math.ceil(length / 153)
}

export const TEXTING_HOURS = { start: 8, end: 21 } as const

export function isWithinTextingHours(now: Date): boolean {
    const { hour } = zonedParts(now)
    return hour >= TEXTING_HOURS.start && hour < TEXTING_HOURS.end
}

function when(date: Date): string {
    return `${formatSalonDate(date, { weekday: "short", month: "short", day: "numeric" })} at ${formatSalonTime(date)}`
}

export function shortLink(url: string | null): string | null {
    return url ? url.replace(/^https?:\/\//, "") : null
}

function message(...parts: (string | null | false)[]): string {
    return toGsm7([`${SITE_NAME}:`, ...parts.filter(Boolean), OPT_OUT].join(" "))
}

export function optInRequestSms(): string {
    return toGsm7(
        `${SITE_NAME}: Reply YES to get appointment texts (${SMS_FREQUENCY}). ` +
            "Msg & data rates may apply. Reply HELP for help, STOP to opt out.",
    )
}

export function optInConfirmedSms(): string {
    return toGsm7(
        `${SITE_NAME}: You're signed up for appointment texts, ${SMS_FREQUENCY}. ` +
            "Msg & data rates may apply. Reply HELP for help, STOP to opt out.",
    )
}

export function joinNotFoundSms(): string {
    return toGsm7(
        `${SITE_NAME}: We couldn't find a customer record with this number. ` +
            "Please ask us to add it, then text JOIN again. Reply STOP to opt out.",
    )
}

type AppointmentSmsDetails = {
    artistName: string
    startTime: Date
    manageUrl: string | null
}

const CALL = formatPhone(BOOKING_PHONE)

export function bookingConfirmationSms({
    artistName,
    startTime,
    manageUrl,
}: AppointmentSmsDetails): string {
    const link = shortLink(manageUrl)
    return message(
        `You're booked with ${artistName} on ${when(startTime)}.`,
        link && `Details: ${link}`,
    )
}

export function rescheduleSms({ artistName, startTime, manageUrl }: AppointmentSmsDetails): string {
    const link = shortLink(manageUrl)
    return message(
        `Your appointment with ${artistName} moved to ${when(startTime)}.`,
        link && `Details: ${link}`,
    )
}

export function cancellationSms({
    artistName,
    startTime,
    cancelledBy,
}: Omit<AppointmentSmsDetails, "manageUrl"> & { cancelledBy: "customer" | "salon" }): string {
    const what = `Your ${when(startTime)} appointment with ${artistName} is cancelled.`
    return message(what, cancelledBy === "salon" && `Sorry! Call ${CALL} for a new time.`)
}

export function reminderSms({ artistName, startTime }: AppointmentSmsDetails): string {
    return message(`Reminder: ${artistName}, ${when(startTime)}.`, `To change, call ${CALL}.`)
}

export function recurringConfirmationSms({
    artistName,
    firstStart,
    visits,
    intervalWeeks,
}: {
    artistName: string
    firstStart: Date
    visits: number
    intervalWeeks: number
}): string {
    const every = intervalWeeks === 1 ? "every week" : `every ${intervalWeeks} weeks`
    return message(
        `Standing appointment booked with ${artistName}, ${every}: ${visits} ${visits === 1 ? "visit" : "visits"} from ${when(firstStart)}.`,
        "Details by email.",
    )
}

export function recurringCancelledSms({
    artistName,
    visits,
}: {
    artistName: string
    visits: number
}): string {
    return message(
        `Your standing appointment with ${artistName} is cancelled (${visits} upcoming ${visits === 1 ? "visit" : "visits"}).`,
    )
}
