import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const APP_DIR = path.join(process.cwd(), "src", "app")

function filesNamed(dir: string, name: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) return filesNamed(full, name)
        return entry === name ? [full] : []
    })
}

function relative(file: string): string {
    return path.relative(process.cwd(), file)
}

function awaitsIn(source: string): string[] {
    return [...source.matchAll(/\bawait\s+([A-Za-z_][\w.]*)/g)].map((match) => match[1])
}

function handlersIn(source: string): { method: string; body: string }[] {
    return source
        .split(/export async function (?=GET|POST|PUT|PATCH|DELETE)/)
        .slice(1)
        .map((body) => ({ method: body.slice(0, body.indexOf("(")), body }))
}

const URL_INPUTS = new Set(["params", "searchParams"])

test("every admin page awaits requireAdminPage() before any other await", () => {
    const pages = filesNamed(path.join(APP_DIR, "admin"), "page.tsx")
    assert.ok(pages.length >= 11, `expected the admin pages, found ${pages.length}`)

    for (const page of pages) {
        const source = readFileSync(page, "utf8")
        const body = source.slice(source.indexOf("export default"))
        const firstDataAwait = awaitsIn(body).find((expression) => !URL_INPUTS.has(expression))
        assert.equal(
            firstDataAwait,
            "requireAdminPage",
            `${relative(page)}: the first await must be requireAdminPage(...)`,
        )
    }
})

test("every /api/admin handler awaits requireAdmin() or requireAdminId() first", () => {
    const routes = filesNamed(path.join(APP_DIR, "api", "admin"), "route.ts")
    assert.ok(routes.length >= 20, `expected the admin routes, found ${routes.length}`)

    for (const route of routes) {
        const handlers = handlersIn(readFileSync(route, "utf8"))
        assert.ok(handlers.length > 0, `${relative(route)}: no handlers found`)

        for (const { method, body } of handlers) {
            const firstAwait = awaitsIn(body)[0]
            assert.ok(
                firstAwait === "requireAdmin" || firstAwait === "requireAdminId",
                `${relative(route)} ${method}: the first await must be the admin guard, got ${firstAwait}`,
            )
        }
    }
})

const TWILIO_WEBHOOKS = [
    path.join("sms", "inbound", "route.ts"),
    path.join("sms", "status", "route.ts"),
]
const CSRF_EXEMPT = new Set([
    path.join("auth", "[...nextauth]", "route.ts"),
    path.join("jobs", "send-reminders", "route.ts"),
    ...TWILIO_WEBHOOKS,
])

test("Twilio webhooks check the signature before anything else", () => {
    for (const route of TWILIO_WEBHOOKS) {
        for (const { method, body } of handlersIn(
            readFileSync(path.join(APP_DIR, "api", route), "utf8"),
        )) {
            assert.equal(
                awaitsIn(body)[0],
                "readTwilioRequest",
                `api/${route} ${method}: the first await must be readTwilioRequest(request)`,
            )
        }
    }
})

test("every mutating API handler refuses cross-origin requests", () => {
    const apiDir = path.join(APP_DIR, "api")
    const routes = filesNamed(apiDir, "route.ts").filter(
        (route) => !CSRF_EXEMPT.has(path.relative(apiDir, route)),
    )

    for (const route of routes) {
        for (const { method, body } of handlersIn(readFileSync(route, "utf8"))) {
            if (method === "GET") continue
            assert.ok(
                /readJsonObject\(request\)|rejectCrossOrigin\(request\)/.test(body),
                `${relative(route)} ${method}: call readJsonObject(request) or rejectCrossOrigin(request)`,
            )
        }
    }
})
