import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { serviceCategoryError } from "@/lib/service-category-data"
import { optionalText, requiredText, TEXT_LIMITS } from "@/lib/validation"
import { readJsonObject } from "@/lib/request"
import { isFeeCents, MAX_SERVICE_FEE_CENTS } from "@/lib/pay-report"
import { formatPrice } from "@/lib/format"
import { SERVICE_PAY_TERMS_INCLUDE, setServiceFee } from "@/lib/pay-terms"

export async function POST(request: Request) {
    const notAuthorized = await requireAdmin()
    if (notAuthorized) {
        return notAuthorized
    }

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { categoryId, durationMinutes, priceCents } = body

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

    const categoryError = await serviceCategoryError(categoryId, { serviceActive: true })
    if (categoryError) {
        return Response.json({ error: categoryError }, { status: 400 })
    }

    if (durationMinutes === undefined || durationMinutes === null) {
        return Response.json({ error: "Duration is required" }, { status: 400 })
    }

    if (
        typeof durationMinutes !== "number" ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0 ||
        durationMinutes % 15 !== 0
    ) {
        return Response.json(
            { error: "Duration must be a positive multiple of 15 minutes" },
            { status: 400 },
        )
    }

    if (priceCents === undefined || priceCents === null) {
        return Response.json({ error: "Price is required" }, { status: 400 })
    }

    if (typeof priceCents !== "number" || !Number.isInteger(priceCents) || priceCents < 0) {
        return Response.json(
            { error: "Price must be a non-negative whole number of cents" },
            { status: 400 },
        )
    }

    const { serviceFeeCents } = body
    if (serviceFeeCents !== undefined && !isFeeCents(serviceFeeCents)) {
        return Response.json(
            { error: `Service fee must be from $0 to ${formatPrice(MAX_SERVICE_FEE_CENTS)}` },
            { status: 400 },
        )
    }

    const service = await prisma.$transaction(async (tx) => {
        const created = await tx.service.create({
            data: {
                name,
                description: description.value ?? null,
                categoryId: categoryId as string,
                durationMinutes,
                priceCents,
            },
        })
        if (typeof serviceFeeCents === "number") {
            await setServiceFee(tx, created.id, serviceFeeCents)
        }
        return tx.service.findUniqueOrThrow({
            where: { id: created.id },
            include: SERVICE_PAY_TERMS_INCLUDE,
        })
    })

    return Response.json({ data: service }, { status: 201 })
}
