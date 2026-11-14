import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { requiredText, TEXT_LIMITS } from "@/lib/validation"
import { cleanCategoryName, isCategoryColor } from "@/lib/service-category"
import { categoryNameTaken } from "@/lib/service-category-data"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id } = await params

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    let name: string | undefined
    if (body.name !== undefined) {
        const parsed = requiredText(body.name, TEXT_LIMITS.categoryName)
        if (parsed === null) {
            return Response.json(
                { error: `Name is required (up to ${TEXT_LIMITS.categoryName} characters)` },
                { status: 400 },
            )
        }
        name = cleanCategoryName(parsed)
    }

    const { color, active } = body
    if (color !== undefined && !isCategoryColor(color)) {
        return Response.json({ error: "Color is invalid" }, { status: 400 })
    }
    if (active !== undefined && typeof active !== "boolean") {
        return Response.json({ error: "Active must be a boolean" }, { status: 400 })
    }

    const category = await prisma.serviceCategory.findUnique({ where: { id } })
    if (!category) {
        return Response.json({ error: "Category not found" }, { status: 404 })
    }

    if (name !== undefined && (await categoryNameTaken(name, id))) {
        return Response.json(
            { error: `There's already a category called ${name}` },
            { status: 409 },
        )
    }

    try {
        if (active === false && category.active) {
            const retired = await prisma.serviceCategory.updateMany({
                where: { id, services: { none: { active: true } } },
                data: { active: false },
            })
            if (retired.count === 0) {
                return Response.json(
                    {
                        error: `${category.name} still has services on the menu. Move them to another category or deactivate them first.`,
                    },
                    { status: 409 },
                )
            }
        } else if (active === true) {
            await prisma.serviceCategory.update({ where: { id }, data: { active: true } })
        }

        const updated = await prisma.serviceCategory.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(color !== undefined ? { color } : {}),
            },
        })
        return Response.json({ data: updated }, { status: 200 })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return Response.json(
                    { error: `There's already a category called ${name}` },
                    { status: 409 },
                )
            }
            if (error.code === "P2025") {
                return Response.json({ error: "Category not found" }, { status: 404 })
            }
        }
        throw error
    }
}
