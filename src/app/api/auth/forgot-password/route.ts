import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeEmail } from "@/lib/validation"
import { readJsonObject } from "@/lib/request"
import { generateResetToken } from "@/lib/password-reset-token"
import { sendEmail } from "@/lib/email"
import { passwordResetEmail } from "@/lib/email-templates"

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

const GENERIC_RESPONSE_BODY = {
    data: { message: "If an account exists for that email, we've sent a password reset link." },
}

export async function POST(request: Request) {
    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const email = normalizeEmail(body.email)
    if (email === null) {
        return Response.json({ error: "A valid email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.passwordHash) {
        return Response.json(GENERIC_RESPONSE_BODY)
    }

    const recent = await prisma.passwordResetToken.findFirst({
        where: {
            userId: user.id,
            usedAt: null,
            createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
        },
    })
    if (recent) {
        return Response.json(GENERIC_RESPONSE_BODY)
    }

    const { token, tokenHash } = await generateResetToken()

    await prisma.passwordResetToken.create({
        data: {
            userId: user.id,
            tokenHash,
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
    })

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`
    const { subject, html, text } = passwordResetEmail({ resetUrl })

    after(() => sendEmail({ to: user.email, subject, html, text }))

    return Response.json(GENERIC_RESPONSE_BODY)
}
