import { prisma } from "@/lib/prisma"
import { requireAdminId } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { requiredText } from "@/lib/validation"
import { addCredit } from "@/lib/credit"
import { CREDIT_NOTE_MAX } from "@/lib/credit-shared"
import { SERVICE_LINES_INCLUDE } from "@/lib/appointment-services"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const adminId = await requireAdminId()
    if (adminId instanceof Response) return adminId

    const { id } = await params

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const note = requiredText(body.note, CREDIT_NOTE_MAX)
    if (note === null) {
        return Response.json(
            { error: `A reason is required (up to ${CREDIT_NOTE_MAX} characters)` },
            { status: 400 },
        )
    }

    const appointment = await prisma.appointment.findUnique({
        where: { id },
        select: { userId: true, status: true, creditAppliedCents: true },
    })
    if (!appointment) {
        return Response.json({ error: "Appointment not found" }, { status: 404 })
    }
    if (appointment.status !== "COMPLETED" || appointment.creditAppliedCents === 0) {
        return Response.json(
            { error: "Only a completed appointment that used store credit can have it returned" },
            { status: 400 },
        )
    }

    const amountCents = appointment.creditAppliedCents

    const updated = await prisma.$transaction(async (tx) => {
        const { count } = await tx.appointment.updateMany({
            where: { id, creditAppliedCents: amountCents },
            data: { creditAppliedCents: 0 },
        })
        if (count === 0) return null

        await addCredit(tx, {
            userId: appointment.userId,
            amountCents,
            kind: "REVERSED",
            appointmentId: id,
            note,
            createdById: adminId,
        })

        return tx.appointment.findUniqueOrThrow({ where: { id }, include: SERVICE_LINES_INCLUDE })
    })

    if (!updated) {
        return Response.json(
            { error: "This appointment's store credit was already changed. Reload and try again." },
            { status: 409 },
        )
    }

    return Response.json({ data: updated })
}
