import { prisma } from "@/lib/prisma"
import { readTwilioRequest } from "@/lib/twilio-webhook"
import { TWILIO_OPTED_OUT_CODE } from "@/lib/sms"
import { optOutPhone } from "@/lib/sms-consent-data"

export async function POST(request: Request) {
    const params = await readTwilioRequest(request)
    if (params instanceof Response) return params

    const sid = params.get("MessageSid")
    const status = params.get("MessageStatus")
    if (sid && status) {
        const errorCode = params.get("ErrorCode") || null
        await prisma.smsMessage.updateMany({
            where: { providerSid: sid },
            data: { status, errorCode },
        })

        const to = params.get("To")
        if (errorCode === TWILIO_OPTED_OUT_CODE && to) await optOutPhone(to, "carrier")
    }

    return new Response(null, { status: 204 })
}
