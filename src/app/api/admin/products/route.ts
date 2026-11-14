import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { optionalText, requiredText, TEXT_LIMITS } from "@/lib/validation"
import { readJsonObject } from "@/lib/request"
import { formatPrice } from "@/lib/format"
import { isProductPriceCents, MAX_PRODUCT_PRICE_CENTS } from "@/lib/retail"

export async function GET() {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } })
    return Response.json({ data: products })
}

export async function POST(request: Request) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const name = requiredText(body.name, TEXT_LIMITS.serviceName)
    if (name === null) {
        return Response.json({ error: "Name is required" }, { status: 400 })
    }

    const description = optionalText(body.description, TEXT_LIMITS.description)
    if (!description.ok) {
        return Response.json(
            { error: `Description must be text of at most ${TEXT_LIMITS.description} characters` },
            { status: 400 },
        )
    }

    if (!isProductPriceCents(body.priceCents)) {
        return Response.json(
            { error: `Price must be from $0 to ${formatPrice(MAX_PRODUCT_PRICE_CENTS)}` },
            { status: 400 },
        )
    }

    const product = await prisma.product.create({
        data: { name, description: description.value ?? null, priceCents: body.priceCents },
    })

    return Response.json({ data: product }, { status: 201 })
}
