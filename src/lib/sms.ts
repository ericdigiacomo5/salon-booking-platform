import { errorMessage, reportError } from "@/lib/report-error"

export type SmsResult =
    | { ok: true; sid: string | null; status: string }
    | {
          ok: false
          notConfigured: boolean
          optedOut: boolean
          errorCode: string | null
      }

export const TWILIO_OPTED_OUT_CODE = "21610"

export function isSmsConfigured(): boolean {
    return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_MESSAGING_SERVICE_SID,
    )
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

    if (!accountSid || !authToken || !messagingServiceSid) {
        if (process.env.NODE_ENV === "production") {
            return { ok: false, notConfigured: true, optedOut: false, errorCode: null }
        }
        console.log("[sms:dev] would send:", { to, body })
        return { ok: true, sid: null, status: "dev" }
    }

    const form = new URLSearchParams({
        To: to,
        MessagingServiceSid: messagingServiceSid,
        Body: body,
    })
    if (process.env.NEXT_PUBLIC_APP_URL) {
        form.set("StatusCallback", `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status`)
    }

    try {
        const res = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: form,
            },
        )
        const json = (await res.json().catch(() => null)) as {
            sid?: string
            status?: string
            code?: number
            message?: string
        } | null

        if (!res.ok) {
            const errorCode = json?.code ? String(json.code) : null
            const optedOut = errorCode === TWILIO_OPTED_OUT_CODE
            if (!optedOut) {
                await reportError({
                    event: "sms_failed",
                    message: `Twilio returned ${res.status} (code ${errorCode ?? "none"}): ${json?.message ?? ""}`,
                })
            }
            return { ok: false, notConfigured: false, optedOut, errorCode }
        }

        return { ok: true, sid: json?.sid ?? null, status: json?.status ?? "queued" }
    } catch (error) {
        await reportError({
            event: "sms_failed",
            message: `Twilio request threw: ${errorMessage(error)}`,
        })
        return { ok: false, notConfigured: false, optedOut: false, errorCode: null }
    }
}
