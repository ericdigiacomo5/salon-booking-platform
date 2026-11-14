import openNext from "./.open-next/worker.js"
import { isKnownPath } from "./known-paths.mjs"

const SIGN_IN_PATH = "/api/auth/callback/credentials"

const ACCOUNT_ROUTES = new Map([
    ["/api/auth/forgot-password", "POST"],
    ["/api/auth/reset-password", "POST"],
    ["/api/auth/verify-email", "POST"],
    ["/api/auth/resend-verification", "POST"],
    ["/api/users/me/password", "POST"],
    ["/api/users/me", "PATCH"],
])

async function rateLimitFor(request, url) {
    if (request.method === "POST" && url.pathname === SIGN_IN_PATH) {
        const form = await request
            .clone()
            .formData()
            .catch(() => null)
        const email = String(form?.get("email") ?? "")
            .trim()
            .toLowerCase()
        const key = email ? `email:${email}` : `ip:${clientIp(request)}`
        return { limiter: "SIGN_IN_LIMITER", key }
    }
    if (ACCOUNT_ROUTES.get(url.pathname) === request.method) {
        return { limiter: "ACCOUNT_LIMITER", key: `ip:${clientIp(request)}` }
    }
    return null
}

function clientIp(request) {
    return request.headers.get("cf-connecting-ip") ?? "unknown"
}

function tooManyRequests(siteUrl, isSignIn) {
    const headers = { "Retry-After": "60", "Cache-Control": "no-store" }
    const body = isSignIn
        ? { url: new URL("/login?error=TooManyAttempts", siteUrl).toString() }
        : { error: "Too many attempts. Please wait a minute and try again." }
    return Response.json(body, { status: 429, headers })
}

const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page not found | Demo Nail Salon</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6ead9;color:#16212c;font-family:Georgia,"Times New Roman",serif;text-align:center;padding:16px;box-sizing:border-box}
h1{font-size:28px;margin:0 0 12px}
p{font-family:system-ui,sans-serif;font-size:16px;margin:0 0 24px}
a{display:inline-flex;align-items:center;min-height:44px;padding:0 24px;background:#16212c;color:#f6ead9;border-radius:4px;font-family:system-ui,sans-serif;font-weight:600;text-decoration:none}
</style>
</head>
<body>
<main>
<h1>Page not found</h1>
<p>There's no page at this address.</p>
<a href="/">Go to Demo Nail Salon</a>
</main>
</body>
</html>`

function notFound(request, siteUrl) {
    const headers = {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Content-Security-Policy":
            "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }
    if (siteUrl.startsWith("https://")) {
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    }
    const body = request.method === "HEAD" ? null : NOT_FOUND_HTML
    return new Response(body, { status: 404, headers })
}

const PING_BODY = JSON.stringify({ data: { status: "ok" } })

function ping(request, siteUrl) {
    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    }
    if (siteUrl.startsWith("https://")) {
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    }
    const body = request.method === "HEAD" ? null : PING_BODY
    return new Response(body, { status: 200, headers })
}

const worker = {
    async fetch(request, env, ctx) {
        const url = new URL(request.url)
        const siteHost = new URL(env.AUTH_URL).hostname
        if (url.hostname === `www.${siteHost}`) {
            url.hostname = siteHost
            return Response.redirect(url.toString(), 301)
        }

        if (!isKnownPath(url.pathname)) return notFound(request, env.AUTH_URL)

        if (url.pathname === "/api/ping" && (request.method === "GET" || request.method === "HEAD")) {
            return ping(request, env.AUTH_URL)
        }

        const limit = await rateLimitFor(request, url)
        if (limit && env[limit.limiter]) {
            const { success } = await env[limit.limiter].limit({ key: limit.key })
            if (!success) return tooManyRequests(env.AUTH_URL, limit.limiter === "SIGN_IN_LIMITER")
        }

        return openNext.fetch(request, env, ctx)
    },

    async scheduled(controller, env, ctx) {
        const request = new Request(new URL("/api/jobs/send-reminders", env.AUTH_URL), {
            method: "POST",
            headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
        })
        const response = await openNext.fetch(request, env, ctx)
        if (!response.ok) {
            throw new Error(`Reminder job failed: HTTP ${response.status}`)
        }
    },
}

export default worker
