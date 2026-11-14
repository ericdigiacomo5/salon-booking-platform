export const KNOWN_FIRST_SEGMENTS = new Set([
    "",
    "about",
    "account",
    "admin",
    "api",
    "appointments",
    "artists",
    "forgot-password",
    "login",
    "privacy",
    "reset-password",
    "services",
    "terms",
    "verify-email",
    "favicon.ico",
    "manifest.webmanifest",
    "_next",
    "hero.jpg",
    "icons",
    "logo.png",
    "offline.html",
    "sw.js",
])

export function firstSegment(pathname) {
    const segment = pathname.split("/")[1] ?? ""
    try {
        return decodeURIComponent(segment)
    } catch {
        return segment
    }
}

export function isKnownPath(pathname) {
    return KNOWN_FIRST_SEGMENTS.has(firstSegment(pathname))
}
