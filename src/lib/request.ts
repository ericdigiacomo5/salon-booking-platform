function allowedOrigins(request: Request): Set<string> {
    const origins = new Set([new URL(request.url).origin])
    if (process.env.AUTH_URL) {
        try {
            origins.add(new URL(process.env.AUTH_URL).origin)
        } catch {
        }
    }
    return origins
}

export function rejectCrossOrigin(request: Request): Response | null {
    const origin = request.headers.get("origin")
    if (origin !== null && !allowedOrigins(request).has(origin)) {
        return Response.json({ error: "Cross-origin request refused" }, { status: 403 })
    }
    return null
}

export async function readJsonObject(
    request: Request,
): Promise<Record<string, unknown> | Response> {
    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    const contentType = request.headers.get("content-type") ?? ""
    if (!contentType.toLowerCase().startsWith("application/json")) {
        return Response.json(
            { error: "Send the request body as application/json" },
            { status: 415 },
        )
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        return Response.json({ error: "Invalid request body" }, { status: 400 })
    }

    return body as Record<string, unknown>
}
