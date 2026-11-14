import { sendDueReminders } from "@/lib/appointment-emails"
import { runSmsJob } from "@/lib/appointment-sms"
import { requireJobSecret } from "@/lib/job-auth"
import { reportError } from "@/lib/report-error"

export async function POST(request: Request) {
    const denied = await requireJobSecret(request)
    if (denied) return denied

    const result = await sendDueReminders()
    const sms = await runSmsJob()

    if (result.failed > 0) {
        await reportError({
            event: "reminders_failed",
            message: `${result.failed} of ${result.considered} reminder emails failed to send`,
            path: "/api/jobs/send-reminders",
        })
    }
    if (sms.reminders.failed > 0) {
        await reportError({
            event: "sms_reminders_failed",
            message: `${sms.reminders.failed} of ${sms.reminders.considered} reminder texts failed to send`,
            path: "/api/jobs/send-reminders",
        })
    }

    const heartbeat = process.env.CRON_HEARTBEAT_URL
    if (heartbeat) {
        await fetch(heartbeat, { method: "POST" }).catch(() => undefined)
    }

    return Response.json({ data: { ...result, sms } })
}
