import { prisma } from "@/lib/prisma"
import { PUBLIC_SERVICE_SELECT } from "@/lib/public-select"

export async function GET() {
    const services = await prisma.service.findMany({
        where: { active: true },
        select: PUBLIC_SERVICE_SELECT,
    })

    return Response.json({ data: services })
}
