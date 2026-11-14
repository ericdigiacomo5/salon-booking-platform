import { errorMessage, reportError } from "@/lib/report-error"
import { SALON_CONTACT } from "@/lib/site"

const RESEND_API_URL = "https://api.resend.com/emails"

type SendEmailArgs = {
    to: string
    subject: string
    html: string
    text: string
}

export async function sendEmail({
    to,
    subject,
    html,
    text,
}: SendEmailArgs): Promise<{ ok: boolean }> {
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
        if (process.env.NODE_ENV === "production") {
            await reportError({
                event: "email_failed",
                message: "RESEND_API_KEY is not set — email not sent",
            })
            return { ok: false }
        }
        console.log("[email:dev] would send:", { to, subject, text })
        return { ok: true }
    }

    try {
        const res = await fetch(RESEND_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM,
                ...(SALON_CONTACT.email && { reply_to: SALON_CONTACT.email }),
                to,
                subject,
                html,
                text,
            }),
        })

        if (!res.ok) {
            await reportError({
                event: "email_failed",
                message: `Resend returned ${res.status}: ${await res.text()}`,
            })
            return { ok: false }
        }

        return { ok: true }
    } catch (error) {
        await reportError({
            event: "email_failed",
            message: `Resend request threw: ${errorMessage(error)}`,
        })
        return { ok: false }
    }
}
