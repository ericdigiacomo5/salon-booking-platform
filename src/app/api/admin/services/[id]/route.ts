import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/require-admin"
import { serviceCategoryError } from "@/lib/service-category-data"
import { optionalText, requiredText, TEXT_LIMITS } from "@/lib/validation"
import { readJsonObject, rejectCrossOrigin } from "@/lib/request"
import { isFeeCents, MAX_SERVICE_FEE_CENTS } from "@/lib/pay-report"
import { formatPrice } from "@/lib/format"
import { SERVICE_PAY_TERMS_INCLUDE, setServiceFee } from "@/lib/pay-terms"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id } = await params

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { categoryId, durationMinutes, priceCents, active, serviceFeeCents } = body

    let name: string | undefined
    if (body.name !== undefined) {
        const parsed = requiredText(body.name, TEXT_LIMITS.serviceName)
        if (parsed === null) {
            return Response.json({ error: "Name is invalid" }, { status: 400 })
        }
        name = parsed
    }

    const description = optionalText(body.description, TEXT_LIMITS.description)
    if (!description.ok) {
        return Response.json(
            { error: `Description must be text of at most ${TEXT_LIMITS.description} characters` },
            { status: 400 },
        )
    }

    if (
        durationMinutes !== undefined &&
        (typeof durationMinutes !== "number" ||
            !Number.isInteger(durationMinutes) ||
            durationMinutes <= 0 ||
            durationMinutes % 15 !== 0)
    ) {
        return Response.json(
            { error: "Duration must be a positive multiple of 15 minutes" },
            { status: 400 },
        )
    }

    if (
        priceCents !== undefined &&
        (typeof priceCents !== "number" || !Number.isInteger(priceCents) || priceCents < 0)
    ) {
        return Response.json(
            { error: "Price must be a non-negative whole number of cents" },
            { status: 400 },
        )
    }

    if (active !== undefined && typeof active !== "boolean") {
        return Response.json({ error: "Active must be a boolean" }, { status: 400 })
    }

    if (serviceFeeCents !== undefined && !isFeeCents(serviceFeeCents)) {
        return Response.json(
            { error: `Service fee must be from $0 to ${formatPrice(MAX_SERVICE_FEE_CENTS)}` },
            { status: 400 },
        )
    }

    const service = await prisma.service.findUnique({
        where: { id: id },
    })

    if (!service) {
        return Response.json({ error: "Service not found" }, { status: 404 })
    }

    const finalCategoryId = categoryId === undefined ? service.categoryId : categoryId
    if (categoryId !== undefined || active === true) {
        const categoryError = await serviceCategoryError(finalCategoryId, {
            serviceActive: typeof active === "boolean" ? active : service.active,
            unchanged: finalCategoryId === service.categoryId,
        })
        if (categoryError) {
            return Response.json({ error: categoryError }, { status: 400 })
        }
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (description.value !== undefined) data.description = description.value
    if (categoryId !== undefined) data.categoryId = categoryId
    if (durationMinutes !== undefined) data.durationMinutes = durationMinutes
    if (priceCents !== undefined) data.priceCents = priceCents
    if (active !== undefined) data.active = active

    try {
        const updatedService = await prisma.$transaction(async (tx) => {
            await tx.service.update({
                where: { id: service.id },
                data,
            })
            if (serviceFeeCents !== undefined) {
                await setServiceFee(tx, service.id, serviceFeeCents as number)
            }
            return tx.service.findUniqueOrThrow({
                where: { id: service.id },
                include: SERVICE_PAY_TERMS_INCLUDE,
            })
        })

        return Response.json({ data: updatedService }, { status: 200 })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Service not found" }, { status: 404 })
        }

        throw error
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    const { id } = await params

    const service = await prisma.service.findUnique({
        where: { id },
    })

    if (!service) {
        return Response.json({ error: "Service not found" }, { status: 404 })
    }

    try {
        const deactivatedService = await prisma.service.update({
            where: { id },
            data: { active: false },
        })

        return Response.json({ data: deactivatedService }, { status: 200 })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Service not found" }, { status: 404 })
        }

        throw error
    }
}
