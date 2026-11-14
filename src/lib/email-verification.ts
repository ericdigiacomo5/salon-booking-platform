import { after } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateResetToken } from "@/lib/password-reset-token"
import { sendEmail } from "@/lib/email"
import { emailVerificationEmail } from "@/lib/email-templates"

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000

export async function issueEmailVerification(
    userId: string,
    email: string,
    purpose: "signup" | "change",
): Promise<boolean> {
    const recent = await prisma.emailVerificationToken.findFirst({
        where: {
            userId,
            usedAt: null,
            createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) },
        },
        select: { id: true },
    })
    if (recent) return false

    const { token, tokenHash } = await generateResetToken()
    await prisma.emailVerificationToken.create({
        data: { userId, email, tokenHash, expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS) },
    })

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`
    after(() => sendEmail({ to: email, ...emailVerificationEmail({ verifyUrl, purpose }) }))
    return true
}
