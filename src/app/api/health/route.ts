import { prisma } from "@/lib/prisma"
import { errorMessage, reportError } from "@/lib/report-error"

export async function GET() {
    const headers = { "Cache-Control": "no-store" }

    try {
        await prisma.$queryRaw`SELECT 1`
        return Response.json({ data: { status: "ok" } }, { headers })
    } catch (error) {
        await reportError({
            event: "health_check_failed",
            message: errorMessage(error),
            path: "/api/health",
        })
        return Response.json({ error: "Unavailable" }, { status: 503, headers })
    }
}
