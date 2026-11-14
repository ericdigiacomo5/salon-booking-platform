import { prisma } from "@/lib/prisma"
import { DEFAULT_POLICY, type PolicySettings } from "@/lib/recurring"
import { DEFAULT_TAX_RATE_MILLIPERCENT } from "@/lib/retail"

export async function getPolicySettings(): Promise<PolicySettings> {
    const settings = await prisma.appSettings.findUnique({
        where: { id: 1 },
        select: { cancellationNoticeHours: true, maxSeriesWeeks: true },
    })
    return settings ?? { ...DEFAULT_POLICY }
}

export async function getRetailTaxRate(): Promise<number> {
    const settings = await prisma.appSettings.findUnique({
        where: { id: 1 },
        select: { retailTaxRateMillipercent: true },
    })
    return settings?.retailTaxRateMillipercent ?? DEFAULT_TAX_RATE_MILLIPERCENT
}
