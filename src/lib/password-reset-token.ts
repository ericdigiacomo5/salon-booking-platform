function toHex(bytes: ArrayBuffer | Uint8Array): string {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
    return toHex(digest)
}

export async function generateResetToken(): Promise<{ token: string; tokenHash: string }> {
    const token = toHex(crypto.getRandomValues(new Uint8Array(32)))
    const tokenHash = await sha256Hex(token)
    return { token, tokenHash }
}

export async function hashResetToken(token: string): Promise<string> {
    return sha256Hex(token)
}
