import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/require-user"
import { rejectCrossOrigin } from "@/lib/request"

export async function POST(request: Request) {
    const userId = await requireUser()
    if (userId instanceof Response) return userId

    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    await prisma.user.update({
        where: { id: userId },
        data: { sessionsRevokedAt: new Date() },
    })

    return Response.json({ data: { signedOut: true } })
}
