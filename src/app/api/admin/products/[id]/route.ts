import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/require-admin"
import { optionalText, requiredText, TEXT_LIMITS } from "@/lib/validation"
import { readJsonObject } from "@/lib/request"
import { formatPrice } from "@/lib/format"
import { isProductPriceCents, MAX_PRODUCT_PRICE_CENTS } from "@/lib/retail"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id } = await params

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const data: Prisma.ProductUpdateInput = {}

    if (body.name !== undefined) {
        const name = requiredText(body.name, TEXT_LIMITS.serviceName)
        if (name === null) {
            return Response.json({ error: "Name is invalid" }, { status: 400 })
        }
        data.name = name
    }

    const description = optionalText(body.description, TEXT_LIMITS.description)
    if (!description.ok) {
        return Response.json(
            { error: `Description must be text of at most ${TEXT_LIMITS.description} characters` },
            { status: 400 },
        )
    }
    if (description.value !== undefined) data.description = description.value

    if (body.priceCents !== undefined) {
        if (!isProductPriceCents(body.priceCents)) {
            return Response.json(
                { error: `Price must be from $0 to ${formatPrice(MAX_PRODUCT_PRICE_CENTS)}` },
                { status: 400 },
            )
        }
        data.priceCents = body.priceCents
    }

    if (body.active !== undefined) {
        if (typeof body.active !== "boolean") {
            return Response.json({ error: "Active must be a boolean" }, { status: 400 })
        }
        data.active = body.active
    }

    if (Object.keys(data).length === 0) {
        return Response.json(
            { error: "Provide name, description, priceCents and/or active" },
            { status: 400 },
        )
    }

    try {
        const product = await prisma.product.update({ where: { id }, data })
        return Response.json({ data: product })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Product not found" }, { status: 404 })
        }
        throw error
    }
}
