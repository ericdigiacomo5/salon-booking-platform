import { test } from "node:test"
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import {
    bookingConfirmationSms,
    cancellationSms,
    gsm7Segments,
    isWithinTextingHours,
    joinNotFoundSms,
    optInConfirmedSms,
    optInRequestSms,
    recurringCancelledSms,
    recurringConfirmationSms,
    reminderSms,
    rescheduleSms,
    shortLink,
    toGsm7,
} from "@/lib/sms-templates"
import {
    SMS_JOIN_DETAILS,
    SMS_JOIN_KEYWORD,
    inboundKeyword,
    smsJoinHeadline,
    smsStatusOf,
} from "@/lib/sms-consent"
import { toUsE164 } from "@/lib/validation"
import { isValidTwilioSignature, twilioSignature } from "@/lib/twilio-signature"
import { SITE_NAME } from "@/lib/site"

const START = new Date("2026-10-22T14:00:00Z")
const MANAGE = "https://example.com/appointments"

const ALL_MESSAGES = [
    optInRequestSms(),
    optInConfirmedSms(),
    joinNotFoundSms(),
    bookingConfirmationSms({ artistName: "Ava Reyes", startTime: START, manageUrl: MANAGE }),
    rescheduleSms({ artistName: "Ava Reyes", startTime: START, manageUrl: MANAGE }),
    reminderSms({ artistName: "Ava Reyes", startTime: START, manageUrl: MANAGE }),
    cancellationSms({ artistName: "Ava Reyes", startTime: START, cancelledBy: "salon" }),
    cancellationSms({ artistName: "Ava Reyes", startTime: START, cancelledBy: "customer" }),
    recurringConfirmationSms({
        artistName: "Ava Reyes",
        firstStart: START,
        visits: 12,
        intervalWeeks: 2,
    }),
    recurringCancelledSms({ artistName: "Ava Reyes", visits: 8 }),
]

test("every text names the business, says how to opt out, and fits one GSM-7 segment", () => {
    for (const message of ALL_MESSAGES) {
        assert.ok(message.startsWith(`${SITE_NAME}:`), message)
        assert.match(message, /STOP to opt out/, message)
        assert.equal(toGsm7(message), message, `not pure GSM-7: ${JSON.stringify(message)}`)
        assert.equal(gsm7Segments(message), 1, `${message.length} chars: ${message}`)
    }
})

test("the opt-in texts carry the carrier-required details", () => {
    for (const message of [optInRequestSms(), optInConfirmedSms()]) {
        assert.match(message, /Msg & data rates may apply/)
        assert.match(message, /HELP/)
        assert.match(message, /about 2 messages per booking/)
    }
    assert.match(optInRequestSms(), /Reply YES/)
})

test("times are the salon's, without Intl's narrow no-break space", () => {
    const message = bookingConfirmationSms({
        artistName: "Ava Reyes",
        startTime: START,
        manageUrl: MANAGE,
    })
    assert.match(message, /Thu, Oct 22 at 10:00 AM/)
    assert.ok(!message.includes(" "))
    assert.match(message, /Details: example\.com\/appointments/)
})

test("a customer who can't sign in gets no link", () => {
    const message = bookingConfirmationSms({
        artistName: "Ava Reyes",
        startTime: START,
        manageUrl: null,
    })
    assert.ok(!message.includes("Details:"))
    assert.equal(shortLink(null), null)
})

test("the reminder says to call to change, since customers can't change bookings online", () => {
    const message = reminderSms({ artistName: "Ava Reyes", startTime: START, manageUrl: MANAGE })
    assert.match(message, /To change, call \(555\) 555-0100\./)
})

test("toGsm7 replaces typography, strips accents outside GSM-7, drops emoji", () => {
    assert.equal(toGsm7("It’s “great” – 10:00 AM"), `It's "great" - 10:00 AM`)
    assert.equal(toGsm7("José Núñez"), "José Nuñez")
    assert.equal(toGsm7("Nails 💅 done"), "Nails done")
    assert.equal(gsm7Segments("x".repeat(160)), 1)
    assert.equal(gsm7Segments("x".repeat(161)), 2)
    assert.equal(gsm7Segments("€".repeat(81)), 2)
})

test("toUsE164 accepts US numbers in any format and refuses the rest", () => {
    assert.equal(toUsE164("(555) 555-0143"), "+15555550143")
    assert.equal(toUsE164("555.555.0143"), "+15555550143")
    assert.equal(toUsE164("+1 555 555 0143"), "+15555550143")
    assert.equal(toUsE164("15555550143"), "+15555550143")
    assert.equal(toUsE164("555-0143"), null)
    assert.equal(toUsE164("(131) 555-0143"), null)
    assert.equal(toUsE164("+44 20 7946 0958"), null)
    assert.equal(toUsE164("UNKNOWN"), null)
    assert.equal(toUsE164(null), null)
})

test("inboundKeyword trusts Twilio's OptOutType, then the body", () => {
    assert.equal(inboundKeyword("anything", "STOP"), "stop")
    assert.equal(inboundKeyword("anything", "START"), "start")
    assert.equal(inboundKeyword("", "HELP"), "help")
    assert.equal(inboundKeyword(" stop ", null), "stop")
    assert.equal(inboundKeyword("Unsubscribe", null), "stop")
    assert.equal(inboundKeyword("Yes!", null), "start")
    assert.equal(inboundKeyword("y", null), "start")
    assert.equal(inboundKeyword("help", null), "help")
    assert.equal(inboundKeyword("See you tomorrow", null), null)
    assert.equal(inboundKeyword("yes please stop", null), null)
    assert.equal(inboundKeyword(" Join! ", null), "join")
    assert.equal(inboundKeyword("join us", null), null)
})

test("the desk sign carries the carrier-required details", () => {
    const sign = `${smsJoinHeadline("(555) 555-0199")} ${SMS_JOIN_DETAILS}`
    assert.match(sign, new RegExp(`Text ${SMS_JOIN_KEYWORD} to \\(555\\) 555-0199`))
    assert.ok(sign.includes(SITE_NAME))
    assert.match(sign, /Message and data rates may apply/)
    assert.match(sign, /HELP/)
    assert.match(sign, /STOP/)
    assert.match(sign, /isn't a condition of booking/)
})

test("smsStatusOf: texts are on only after the YES reply", () => {
    const phone = "+15555550143"
    assert.equal(smsStatusOf({ smsOptIn: false, smsPhone: null, smsConfirmedAt: null }), "off")
    assert.equal(smsStatusOf({ smsOptIn: false, smsPhone: phone, smsConfirmedAt: null }), "stopped")
    assert.equal(smsStatusOf({ smsOptIn: true, smsPhone: phone, smsConfirmedAt: null }), "waiting")
    assert.equal(smsStatusOf({ smsOptIn: true, smsPhone: phone, smsConfirmedAt: new Date() }), "on")
})

test("texting hours are 8 AM to 9 PM on the salon's clock", () => {
    assert.equal(isWithinTextingHours(new Date("2026-10-22T11:59:00Z")), false)
    assert.equal(isWithinTextingHours(new Date("2026-10-22T12:00:00Z")), true)
    assert.equal(isWithinTextingHours(new Date("2026-10-23T00:59:00Z")), true)
    assert.equal(isWithinTextingHours(new Date("2026-10-23T01:00:00Z")), false)
    assert.equal(isWithinTextingHours(new Date("2026-12-01T13:00:00Z")), true)
})

test("Twilio signatures match an independent HMAC-SHA1 and reject tampering", async () => {
    const token = "test-auth-token"
    const url = "https://example.com/api/sms/inbound"
    const params = new URLSearchParams({
        To: "+15555550199",
        From: "+15555550143",
        Body: "YES",
        MessageSid: "SM123",
    })

    const data =
        url +
        [...params.keys()]
            .sort()
            .map((k) => k + params.get(k))
            .join("")
    const expected = createHmac("sha1", token).update(data).digest("base64")

    assert.equal(await twilioSignature(token, url, params), expected)
    assert.equal(await isValidTwilioSignature(token, url, params, expected), true)
    assert.equal(await isValidTwilioSignature("wrong-token", url, params, expected), false)
    assert.equal(await isValidTwilioSignature(token, url + "?x=1", params, expected), false)
    const tampered = new URLSearchParams(params)
    tampered.set("Body", "STOP")
    assert.equal(await isValidTwilioSignature(token, url, tampered, expected), false)
    assert.equal(await isValidTwilioSignature(token, url, params, null), false)
})
