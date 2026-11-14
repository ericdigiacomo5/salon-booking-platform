import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/require-user"
import { readJsonObject } from "@/lib/request"
import { BCRYPT_COST, passwordError } from "@/lib/password"

export async function POST(request: Request) {
    const userId = await requireUser()
    if (userId instanceof Response) return userId

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { currentPassword, newPassword } = body

    if (typeof currentPassword !== "string" || !currentPassword) {
        return Response.json({ error: "Enter your current password" }, { status: 400 })
    }

    const problem = passwordError(newPassword)
    if (problem || typeof newPassword !== "string") {
        return Response.json({ error: problem }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    })
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 })
    }

    if (user.passwordHash === null || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
        return Response.json({ error: "That password isn't correct" }, { status: 403 })
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)

    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: { passwordHash, passwordChangedAt: new Date() },
        }),
        prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    ])

    return Response.json({ data: { changed: true } })
}
