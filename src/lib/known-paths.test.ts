import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, statSync } from "node:fs"
import path from "node:path"
import { KNOWN_FIRST_SEGMENTS, firstSegment, isKnownPath } from "../../known-paths.mjs"

const APP_DIR = path.join(process.cwd(), "src", "app")
const PUBLIC_DIR = path.join(process.cwd(), "public")

const APP_NON_ROUTE_FILES = new Set([
    "layout.tsx",
    "page.tsx",
    "error.tsx",
    "global-error.tsx",
    "not-found.tsx",
    "loading.tsx",
    "template.tsx",
    "default.tsx",
    "globals.css",
])

const APP_ROUTE_FILES: Record<string, string> = {
    "favicon.ico": "favicon.ico",
    "manifest.ts": "manifest.webmanifest",
}

const PUBLIC_NON_SERVED = new Set(["_headers", "_redirects"])

function servedFirstSegments(): Set<string> {
    const segments = new Set(["", "_next"])
    const unexplained: string[] = []

    function addAppDir(dir: string) {
        for (const entry of readdirSync(dir)) {
            const full = path.join(dir, entry)
            if (statSync(full).isDirectory()) {
                if (entry.startsWith("_")) continue
                if (entry.startsWith("(") && entry.endsWith(")")) addAppDir(full)
                else segments.add(entry)
            } else if (entry in APP_ROUTE_FILES) {
                segments.add(APP_ROUTE_FILES[entry])
            } else if (!APP_NON_ROUTE_FILES.has(entry)) {
                unexplained.push(path.relative(process.cwd(), full))
            }
        }
    }
    addAppDir(APP_DIR)

    for (const entry of readdirSync(PUBLIC_DIR)) {
        if (!PUBLIC_NON_SERVED.has(entry)) segments.add(entry)
    }

    assert.deepEqual(
        unexplained,
        [],
        `Unexpected files in src/app; add each to APP_ROUTE_FILES or APP_NON_ROUTE_FILES in known-paths.test.ts`,
    )
    return segments
}

test("known-paths.mjs lists exactly what src/app and public/ serve", () => {
    const served = servedFirstSegments()
    const listed = new Set(KNOWN_FIRST_SEGMENTS)
    const missing = [...served].filter((segment) => !listed.has(segment)).sort()
    const extra = [...listed].filter((segment) => !served.has(segment)).sort()
    assert.deepEqual(
        missing,
        [],
        "served by the site but missing from known-paths.mjs (it would 404)",
    )
    assert.deepEqual(extra, [], "in known-paths.mjs but no longer served (remove it)")
})

test("isKnownPath checks the first segment only", () => {
    for (const known of [
        "/",
        "/about",
        "/about/",
        "/artists/some-id",
        "/admin/users/123",
        "/api/ping",
        "/api/anything-at-all",
        "/_next/image",
        "/icons/icon-192.png",
        "/manifest.webmanifest",
        "/%61bout",
    ]) {
        assert.equal(isKnownPath(known), true, known)
    }
    for (const unknown of [
        "/blog",
        "/wp-login.php",
        "/.env",
        "/About",
        "/aboutx",
        "/robots.txt",
        "/%E0%A4%A",
    ]) {
        assert.equal(isKnownPath(unknown), false, unknown)
    }
})

test("firstSegment", () => {
    assert.equal(firstSegment("/"), "")
    assert.equal(firstSegment(""), "")
    assert.equal(firstSegment("/a/b"), "a")
    assert.equal(firstSegment("/a%20b/c"), "a b")
})
