import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { rejectCrossOrigin } from "@/lib/request"
import { generateResetToken } from "@/lib/password-reset-token"
import { sendEmail } from "@/lib/email"
import { accountInviteEmail } from "@/lib/email-templates"

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const INVITE_EXPIRES_IN = "7 days"
const RESEND_COOLDOWN_MS = 60 * 1000

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    const { id } = await params

    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, role: true, passwordHash: true },
    })

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 })
    }

    if (user.role !== "CUSTOMER") {
        return Response.json({ error: "Only customers can be invited" }, { status: 400 })
    }

    if (user.passwordHash !== null) {
        return Response.json(
            {
                error: "This customer can already sign in. They can use “Forgot password?” on the sign-in page.",
            },
            { status: 409 },
        )
    }

    const recent = await prisma.passwordResetToken.findFirst({
        where: {
            userId: user.id,
            usedAt: null,
            createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
        },
        select: { id: true },
    })
    if (recent) {
        return Response.json(
            { error: "An invite was just sent. Please wait a minute before sending another." },
            { status: 429 },
        )
    }

    const { token, tokenHash } = await generateResetToken()

    await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            },
        }),
    ])

    const setPasswordUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}&invite=1`
    const { subject, html, text } = accountInviteEmail({
        setPasswordUrl,
        expiresIn: INVITE_EXPIRES_IN,
    })

    after(() => sendEmail({ to: user.email, subject, html, text }))

    return Response.json({ data: { invited: true, email: user.email } })
}
