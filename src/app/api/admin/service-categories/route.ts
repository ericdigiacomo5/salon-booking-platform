import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { requiredText, TEXT_LIMITS } from "@/lib/validation"
import { CATEGORY_COLORS, cleanCategoryName, isCategoryColor } from "@/lib/service-category"
import { categoryNameTaken } from "@/lib/service-category-data"

export async function POST(request: Request) {
    const notAuthorized = await requireAdmin()
    if (notAuthorized) return notAuthorized

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const parsed = requiredText(body.name, TEXT_LIMITS.categoryName)
    if (parsed === null) {
        return Response.json(
            { error: `Name is required (up to ${TEXT_LIMITS.categoryName} characters)` },
            { status: 400 },
        )
    }
    const name = cleanCategoryName(parsed)

    const color = body.color ?? CATEGORY_COLORS[0]
    if (!isCategoryColor(color)) {
        return Response.json({ error: "Color is invalid" }, { status: 400 })
    }

    if (await categoryNameTaken(name)) {
        return Response.json(
            { error: `There's already a category called ${name}` },
            { status: 409 },
        )
    }

    const last = await prisma.serviceCategory.aggregate({ _max: { position: true } })

    try {
        const category = await prisma.serviceCategory.create({
            data: { name, color, position: (last._max.position ?? 0) + 1 },
        })
        return Response.json({ data: category }, { status: 201 })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return Response.json(
                { error: `There's already a category called ${name}` },
                { status: 409 },
            )
        }
        throw error
    }
}
