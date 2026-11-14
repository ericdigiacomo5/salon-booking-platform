import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/require-admin"
import { readJsonObject } from "@/lib/request"
import { POLICY_LIMITS } from "@/lib/recurring"
import { isTaxRateMillipercent } from "@/lib/retail"
import type { Prisma } from "@/generated/prisma/client"

const SETTINGS_SELECT = {
    retailTaxRateMillipercent: true,
    cancellationNoticeHours: true,
    maxSeriesWeeks: true,
} as const

export async function GET() {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const settings = await prisma.appSettings.findUnique({
        where: { id: 1 },
        select: SETTINGS_SELECT,
    })

    if (!settings) {
        return Response.json({ error: "Could not get settings." }, { status: 404 })
    }

    return Response.json({ data: settings })
}

function isWholeNumberIn(value: unknown, limits: { min: number; max: number }): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= limits.min &&
        value <= limits.max
    )
}

export async function PATCH(request: Request) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { cancellationNoticeHours, maxSeriesWeeks, retailTaxRateMillipercent } = body
    const data: Prisma.AppSettingsUpdateInput = {}

    if (retailTaxRateMillipercent !== undefined) {
        if (!isTaxRateMillipercent(retailTaxRateMillipercent)) {
            return Response.json(
                { error: "Sales tax must be a percentage from 0 to 25, up to three decimals" },
                { status: 400 },
            )
        }
        data.retailTaxRateMillipercent = retailTaxRateMillipercent
    }

    if (cancellationNoticeHours !== undefined) {
        const limits = POLICY_LIMITS.cancellationNoticeHours
        if (!isWholeNumberIn(cancellationNoticeHours, limits)) {
            return Response.json(
                {
                    error: `Cancellation notice must be a whole number of hours from ${limits.min} to ${limits.max}`,
                },
                { status: 400 },
            )
        }
        data.cancellationNoticeHours = cancellationNoticeHours
    }

    if (maxSeriesWeeks !== undefined) {
        const limits = POLICY_LIMITS.maxSeriesWeeks
        if (!isWholeNumberIn(maxSeriesWeeks, limits)) {
            return Response.json(
                {
                    error: `Standing appointment length must be a whole number of weeks from ${limits.min} to ${limits.max}`,
                },
                { status: 400 },
            )
        }
        data.maxSeriesWeeks = maxSeriesWeeks
    }

    if (Object.keys(data).length === 0) {
        return Response.json(
            {
                error: "Provide cancellationNoticeHours, maxSeriesWeeks and/or retailTaxRateMillipercent",
            },
            { status: 400 },
        )
    }

    const settings = await prisma.appSettings.findUnique({
        where: { id: 1 },
    })

    if (!settings) {
        return Response.json({ error: "Could not get settings." }, { status: 404 })
    }

    const updatedSettings = await prisma.appSettings.update({
        where: { id: 1 },
        data,
        select: SETTINGS_SELECT,
    })

    return Response.json({ data: updatedSettings })
}
