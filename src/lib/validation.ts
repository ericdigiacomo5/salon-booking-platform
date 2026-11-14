const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LENGTH = 254

export const TEXT_LIMITS = {
    personName: 100,
    phone: 30,
    artistName: 100,
    bio: 2000,
    serviceName: 100,
    categoryName: 40,
    description: 1000,
    caption: 300,
} as const

export function normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") return null
    const email = value.trim().toLowerCase()
    if (email.length === 0 || email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
        return null
    }
    return email
}

export function requiredText(value: unknown, maxLength: number): string | null {
    if (typeof value !== "string") return null
    const text = value.trim()
    return text.length > 0 && text.length <= maxLength ? text : null
}

export function optionalText(
    value: unknown,
    maxLength: number,
): { ok: true; value: string | null | undefined } | { ok: false } {
    if (value === undefined) return { ok: true, value: undefined }
    if (value === null) return { ok: true, value: null }
    if (typeof value !== "string") return { ok: false }
    const text = value.trim()
    if (text.length > maxLength) return { ok: false }
    return { ok: true, value: text.length > 0 ? text : null }
}

const NAME_LINK_PATTERN =
    /:\/\/|www\.|@|\b[a-z0-9-]+\.(com|net|org|info|biz|io|co|xyz|app|link|site|online|top|me|us|ly)\b/i

export function requiredPersonName(value: unknown): string | null {
    const name = requiredText(value, TEXT_LIMITS.personName)
    return name !== null && !NAME_LINK_PATTERN.test(name) ? name : null
}

export function personNameError(value: unknown): string {
    return requiredText(value, TEXT_LIMITS.personName) === null
        ? `Name is required (up to ${TEXT_LIMITS.personName} characters)`
        : "Names can't contain web or email addresses"
}

export function normalizePhone(value: unknown): string | null {
    return requiredText(value, TEXT_LIMITS.phone)
}

export function toUsE164(phone: string | null | undefined): string | null {
    if (!phone) return null
    const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
    return `+1${digits}`
}

export const UNKNOWN_PHONE = "UNKNOWN"

export const PROFILE_INCOMPLETE_MESSAGE =
    "Please add your name and phone number to your profile before booking, so the salon can reach you."

export const EMAIL_UNVERIFIED_MESSAGE =
    "Please confirm your email address before booking — we sent you a link when you signed up."

export function isCloudinaryUrl(value: unknown, cloudName?: string): value is string {
    if (typeof value !== "string") return false
    try {
        const url = new URL(value)
        if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return false
        return cloudName ? url.pathname.startsWith(`/${cloudName}/`) : true
    } catch {
        return false
    }
}

export function safeCallbackUrl(raw: unknown): string {
    if (typeof raw !== "string" || !raw.startsWith("/")) return "/"
    if (raw.startsWith("//") || raw.startsWith("/\\")) return "/"
    return raw
}
