export async function requireJobSecret(request: Request): Promise<Response | null> {
    const secret = process.env.CRON_SECRET

    if (!secret) {
        return Response.json({ error: "Job route is not configured" }, { status: 503 })
    }

    const header = request.headers.get("authorization") ?? ""
    if (!(await secretsMatch(header, `Bearer ${secret}`))) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    return null
}

async function secretsMatch(a: string, b: string): Promise<boolean> {
    const encoder = new TextEncoder()
    const [hashA, hashB] = await Promise.all([
        crypto.subtle.digest("SHA-256", encoder.encode(a)),
        crypto.subtle.digest("SHA-256", encoder.encode(b)),
    ])
    const bytesA = new Uint8Array(hashA)
    const bytesB = new Uint8Array(hashB)

    let diff = 0
    for (let i = 0; i < bytesA.length; i++) {
        diff |= bytesA[i] ^ bytesB[i]
    }
    return diff === 0
}
