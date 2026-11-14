import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { hashResetToken } from "@/lib/password-reset-token"
import { BCRYPT_COST, passwordError } from "@/lib/password"
import { readJsonObject } from "@/lib/request"

const INVALID_TOKEN_ERROR = { error: "This link is invalid or has expired." }

export async function POST(request: Request) {
    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { token, password } = body

    if (typeof token !== "string" || !token) {
        return Response.json(INVALID_TOKEN_ERROR, { status: 400 })
    }

    const passwordProblem = passwordError(password)
    if (passwordProblem || typeof password !== "string") {
        return Response.json({ error: passwordProblem }, { status: 400 })
    }

    const tokenHash = await hashResetToken(token)

    const resetToken = await prisma.passwordResetToken.findUnique({
        where: { tokenHash },
    })

    if (!resetToken || resetToken.usedAt !== null || resetToken.expiresAt.getTime() < Date.now()) {
        return Response.json(INVALID_TOKEN_ERROR, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
    const now = new Date()

    await prisma.$transaction([
        prisma.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash, passwordChangedAt: now, emailVerified: now },
        }),
        prisma.passwordResetToken.update({
            where: { id: resetToken.id },
            data: { usedAt: now },
        }),
        prisma.passwordResetToken.deleteMany({
            where: {
                userId: resetToken.userId,
                id: { not: resetToken.id },
                usedAt: null,
            },
        }),
    ])

    return Response.json({ data: { message: "Password updated." } })
}
