import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { SAFE_USER_SELECT_BASIC } from "@/lib/user-select"
import { sendRecurringCancelledNotice } from "@/lib/appointment-emails"
import { Prisma } from "@/generated/prisma/client"
import { cancelRecurringSeries, upcomingSkipsInclude } from "@/lib/booking"
import { SERVICE_LINES_INCLUDE } from "@/lib/appointment-services"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id } = await params

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { status } = body
    if (status !== "CANCELLED") {
        return Response.json(
            { error: "A standing appointment can only be cancelled" },
            { status: 400 },
        )
    }

    try {
        const result = await cancelRecurringSeries(id)

        if (result.previousStatus !== "CANCELLED") {
            const freedIds = result.freedAppointmentIds
            after(() => sendRecurringCancelledNotice(id, "salon", freedIds))
        }

        const refreshed = await prisma.recurringAppointment.findUnique({
            where: { id },
            include: {
                artist: true,
                ...SERVICE_LINES_INCLUDE,
                user: { select: SAFE_USER_SELECT_BASIC },
                ...upcomingSkipsInclude(),
            },
        })

        return Response.json({ data: { ...result, recurringAppointment: refreshed } })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Recurring appointment not found" }, { status: 404 })
        }

        throw error
    }
}
