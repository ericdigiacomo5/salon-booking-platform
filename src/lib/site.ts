export const SITE_NAME = "Demo Nail Salon"
export const SITE_TAGLINE = "Hand & gel nail care in Anytown, NY"

export const SALON_CONTACT: {
    address: string | null
    phone: string | null
    email: string | null
    instagramUrl: string | null
    facebookUrl: string | null
    reviewUrl: string | null
    smsNumber: string | null
} = {
    address: "100 Main Street, Anytown, NY 00000",
    phone: "+15555550100",
    email: "hello@example.com",
    instagramUrl: null,
    facebookUrl: null,
    reviewUrl: null,
    smsNumber: null,
}

export const PRIVACY_LAST_UPDATED: string | null = "November 7, 2026"
export const TERMS_LAST_UPDATED: string | null = "November 7, 2026"

export const LEGAL_CONTACT = {
    email: "hello@example.com",
    phone: "+15555550100",
    postalLines: ["Demo Nail Salon", "100 Main Street", "Anytown, NY 00000", "United States"],
} as const

export const BOOKING_PHONE: string = SALON_CONTACT.phone ?? LEGAL_CONTACT.phone

export function mapUrl(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
    return digits.length === 10
        ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
        : phone
}
