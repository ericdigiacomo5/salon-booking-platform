import { isValidTwilioSignature } from "@/lib/twilio-signature"

export async function readTwilioRequest(request: Request): Promise<URLSearchParams | Response> {
    const authToken = process.env.TWILIO_AUTH_TOKEN
    if (!authToken) {
        return Response.json({ error: "Texting is not configured" }, { status: 503 })
    }

    const contentType = request.headers.get("content-type") ?? ""
    if (!contentType.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
        return Response.json({ error: "Unsupported content type" }, { status: 415 })
    }

    const params = new URLSearchParams(await request.text())

    const { pathname, search } = new URL(request.url)
    const publicBase = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
    const signedUrl = `${publicBase.replace(/\/$/, "")}${pathname}${search}`

    if (
        !(await isValidTwilioSignature(
            authToken,
            signedUrl,
            params,
            request.headers.get("x-twilio-signature"),
        ))
    ) {
        return Response.json({ error: "Invalid signature" }, { status: 403 })
    }

    return params
}

export function twiml(message?: string): Response {
    const escaped = message?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    const body = escaped
        ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
        : `<?xml version="1.0" encoding="UTF-8"?><Response/>`
    return new Response(body, { headers: { "Content-Type": "text/xml; charset=utf-8" } })
}
