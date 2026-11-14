import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/require-user"
import { rejectCrossOrigin } from "@/lib/request"
import { issueEmailVerification } from "@/lib/email-verification"

export async function POST(request: Request) {
    const userId = await requireUser()
    if (userId instanceof Response) return userId

    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, emailVerified: true },
    })
    if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 })
    }

    if (user.emailVerified) {
        return Response.json({ data: { alreadyVerified: true } })
    }

    const sent = await issueEmailVerification(userId, user.email, "signup")
    if (!sent) {
        return Response.json(
            { error: "We just sent a link — please wait a minute before asking for another." },
            { status: 429 },
        )
    }

    return Response.json({ data: { sentTo: user.email } })
}
