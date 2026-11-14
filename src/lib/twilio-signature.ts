export async function twilioSignature(
    authToken: string,
    url: string,
    params: URLSearchParams,
): Promise<string> {
    const names = [...new Set(params.keys())].sort()
    let data = url
    for (const name of names) {
        for (const value of params.getAll(name)) data += name + value
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(authToken),
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"],
    )
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)))
    return btoa(String.fromCharCode(...mac))
}

export async function isValidTwilioSignature(
    authToken: string,
    url: string,
    params: URLSearchParams,
    signature: string | null,
): Promise<boolean> {
    if (!signature) return false
    return timingSafeEqual(await twilioSignature(authToken, url, params), signature)
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    return diff === 0
}
