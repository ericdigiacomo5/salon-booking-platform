import { requireAdmin } from "@/lib/require-admin"
import { rejectCrossOrigin } from "@/lib/request"

async function signParams(
    params: Record<string, string | number>,
    apiSecret: string,
): Promise<string> {
    const sorted = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&")

    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(sorted + apiSecret))
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")
}

export async function POST(request: Request) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
        return Response.json({ error: "Image upload is not configured" }, { status: 500 })
    }

    const timestamp = Math.floor(Date.now() / 1000)

    const paramsToSign = { timestamp, folder: "nail-salon" }

    const signature = await signParams(paramsToSign, apiSecret)

    return Response.json({
        cloudName,
        apiKey,
        timestamp,
        signature,
        folder: paramsToSign.folder,
    })
}
