export type ErrorReport = {
    event: string
    message: string
    path?: string
    method?: string
    routePath?: string
    digest?: string
}

const MAX_MESSAGE_LENGTH = 300
const ALERT_INTERVAL_MS = 5 * 60_000
const lastAlertAt = new Map<string, number>()

function stripQuery(path: string): string {
    const index = path.indexOf("?")
    return index === -1 ? path : path.slice(0, index)
}

export async function reportError(report: ErrorReport): Promise<void> {
    try {
        const entry = {
            level: "error",
            ...report,
            path: report.path ? stripQuery(report.path) : undefined,
            message: report.message.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_LENGTH),
            at: new Date().toISOString(),
        }
        console.error(JSON.stringify(entry))

        const webhook = process.env.ERROR_ALERT_WEBHOOK_URL
        if (!webhook) return

        const key = `${entry.event}|${entry.routePath ?? entry.path ?? ""}`
        const now = Date.now()
        if (now - (lastAlertAt.get(key) ?? 0) < ALERT_INTERVAL_MS) return
        lastAlertAt.set(key, now)

        const where = entry.routePath ?? entry.path
        const summary = `[Demo Nail Salon] ${entry.event}${where ? ` at ${where}` : ""}: ${entry.message}${entry.digest ? ` (digest ${entry.digest})` : ""}`
        await fetch(webhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: summary, content: summary }),
        })
    } catch {
    }
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}
