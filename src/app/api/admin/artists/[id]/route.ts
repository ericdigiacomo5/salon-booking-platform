import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { requireAdmin } from "@/lib/require-admin"
import { optionalText, requiredText, TEXT_LIMITS } from "@/lib/validation"
import { isOwnCloudinaryUrl } from "@/lib/cloudinary-url"
import { readJsonObject } from "@/lib/request"
import { isBasisPoints } from "@/lib/pay-report"
import {
    ARTIST_PAY_TERMS_INCLUDE,
    setArtistCommission,
    setArtistRetailCommission,
} from "@/lib/pay-terms"
import { ARTIST_SERVICES_INCLUDE } from "@/lib/artist-services"
import { parseArtistServiceIds, setArtistServices } from "@/lib/artist-services-data"

class UnknownServiceError extends Error {}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const forbidden = await requireAdmin()
    if (forbidden) return forbidden

    const { id } = await params

    const body = await readJsonObject(request)
    if (body instanceof Response) return body

    const { photoUrl, active } = body

    let name: string | undefined
    if (body.name !== undefined) {
        const parsed = requiredText(body.name, TEXT_LIMITS.artistName)
        if (parsed === null) {
            return Response.json({ error: "Name is invalid" }, { status: 400 })
        }
        name = parsed
    }

    const bio = optionalText(body.bio, TEXT_LIMITS.bio)
    if (!bio.ok) {
        return Response.json(
            { error: `Bio must be text of at most ${TEXT_LIMITS.bio} characters` },
            { status: 400 },
        )
    }

    if (active !== undefined && typeof active !== "boolean") {
        return Response.json({ error: "Active must be a boolean" }, { status: 400 })
    }

    const { commissionBasisPoints } = body
    if (
        commissionBasisPoints !== undefined &&
        commissionBasisPoints !== null &&
        !isBasisPoints(commissionBasisPoints)
    ) {
        return Response.json(
            { error: "Commission must be a percentage from 0 to 100" },
            { status: 400 },
        )
    }

    const { retailCommissionBasisPoints } = body
    if (
        retailCommissionBasisPoints !== undefined &&
        retailCommissionBasisPoints !== null &&
        !isBasisPoints(retailCommissionBasisPoints)
    ) {
        return Response.json(
            { error: "Retail commission must be a percentage from 0 to 100" },
            { status: 400 },
        )
    }

    const serviceIds =
        body.serviceIds === undefined ? undefined : parseArtistServiceIds(body.serviceIds)
    if (typeof serviceIds === "string") {
        return Response.json({ error: serviceIds }, { status: 400 })
    }

    const artist = await prisma.artist.findUnique({
        where: { id },
    })

    if (!artist) {
        return Response.json({ error: "Artist not found" }, { status: 404 })
    }

    if (
        photoUrl !== undefined &&
        photoUrl !== null &&
        photoUrl !== "" &&
        photoUrl !== artist.photoUrl &&
        !isOwnCloudinaryUrl(photoUrl)
    ) {
        return Response.json({ error: "Photo must be an uploaded image" }, { status: 400 })
    }

    const data: Prisma.ArtistUpdateInput = {}
    if (name !== undefined) data.name = name
    if (bio.value !== undefined) data.bio = bio.value
    if (photoUrl !== undefined) data.photoUrl = photoUrl ? (photoUrl as string) : null
    if (active !== undefined) data.active = active as boolean

    try {
        await prisma.$transaction(async (tx) => {
            await tx.artist.update({
                where: { id: artist.id },
                data,
            })
            if (commissionBasisPoints !== undefined) {
                await setArtistCommission(tx, artist.id, commissionBasisPoints as number | null)
            }
            if (retailCommissionBasisPoints !== undefined) {
                await setArtistRetailCommission(
                    tx,
                    artist.id,
                    retailCommissionBasisPoints as number | null,
                )
            }
            if (serviceIds !== undefined && !(await setArtistServices(tx, artist.id, serviceIds))) {
                throw new UnknownServiceError()
            }
        })

        const updatedArtist = await prisma.artist.findUniqueOrThrow({
            where: { id: artist.id },
            include: { ...ARTIST_PAY_TERMS_INCLUDE, ...ARTIST_SERVICES_INCLUDE },
        })

        return Response.json({ data: updatedArtist }, { status: 200 })
    } catch (error) {
        if (error instanceof UnknownServiceError) {
            return Response.json({ error: "Service not found" }, { status: 404 })
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return Response.json({ error: "Artist not found" }, { status: 404 })
        }

        throw error
    }
}
