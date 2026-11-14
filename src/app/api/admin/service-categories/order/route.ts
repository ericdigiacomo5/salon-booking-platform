import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { CATEGORY_ORDER, isCompleteOrder } from "@/lib/service-category"

export async function PUT(request: Request) {
    const notAuthorized = await requireAdmin()
    if (notAuthorized) return notAuthorized

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const result = await prisma.$transaction(async (tx) => {
        const ids = (await tx.serviceCategory.findMany({ select: { id: true } })).map((c) => c.id)
        if (!isCompleteOrder(body.order, ids)) return null

        for (const [index, id] of body.order.entries()) {
            await tx.serviceCategory.update({ where: { id }, data: { position: index + 1 } })
        }
        return tx.serviceCategory.findMany({ orderBy: CATEGORY_ORDER })
    })

    if (result === null) {
        return Response.json(
            { error: "Order must list every category exactly once. Reload and try again." },
            { status: 409 },
        )
    }
    return Response.json({ data: result }, { status: 200 })
}
