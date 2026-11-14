import { readTwilioRequest, twiml } from "@/lib/twilio-webhook"
import { inboundKeyword } from "@/lib/sms-consent"
import { confirmPhone, joinByKeyword, optOutPhone } from "@/lib/sms-consent-data"
import { joinNotFoundSms, optInConfirmedSms } from "@/lib/sms-templates"

export async function POST(request: Request) {
    const params = await readTwilioRequest(request)
    if (params instanceof Response) return params

    const from = params.get("From")
    if (!from) return twiml()

    const optOutType = params.get("OptOutType")
    const keyword = inboundKeyword(params.get("Body") ?? "", optOutType)

    if (keyword === "stop") {
        await optOutPhone(from, "sms_reply")
        return twiml()
    }

    if (keyword === "start") {
        const confirmed = await confirmPhone(from)
        return twiml(confirmed > 0 && !optOutType ? optInConfirmedSms() : undefined)
    }

    if (keyword === "join") {
        const { joined, alreadyOn, stopped } = await joinByKeyword(from)
        if (joined + alreadyOn > 0) return twiml(optInConfirmedSms())
        if (stopped > 0) return twiml()
        return twiml(joinNotFoundSms())
    }

    return twiml()
}
