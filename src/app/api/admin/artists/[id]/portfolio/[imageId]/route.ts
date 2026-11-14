import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/require-admin"
import { rejectCrossOrigin } from "@/lib/request"

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; imageId: string }> },
) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const crossOrigin = rejectCrossOrigin(request)
    if (crossOrigin) return crossOrigin

    const { id: artistId, imageId } = await params

    const portfolioImage = await prisma.portfolioImage.findUnique({
        where: { id: imageId },
    })

    if (!portfolioImage || portfolioImage.artistId !== artistId) {
        return Response.json({ error: "Portfolio image not found" }, { status: 404 })
    }

    try {
        const deleted = await prisma.portfolioImage.delete({
            where: { id: imageId },
        })

        return Response.json({ data: deleted }, { status: 200 })
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Portfolio image not found" }, { status: 404 })
        }

        throw error
    }
}
