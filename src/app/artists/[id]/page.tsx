import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { CallToBook } from "@/components/ui/call-to-book"
import { PortfolioGallery } from "@/components/artists/portfolio-gallery"
import { CloudinaryImage } from "@/components/ui/cloudinary-image"
import { DecoDivider } from "@/components/ui/deco"

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>
}): Promise<Metadata> {
    const { id } = await params
    const artist = await prisma.artist.findUnique({
        where: { id },
        select: { name: true, active: true },
    })
    return { title: artist?.active ? artist.name : "Artist" }
}

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const artist = await prisma.artist.findUnique({
        where: { id },
        include: { portfolio: { orderBy: { createdAt: "desc" } } },
    })

    if (!artist || !artist.active) {
        notFound()
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-6">
            <Link
                href="/artists"
                className="inline-flex min-h-11 items-center font-semibold text-foreground hover:text-lacquer"
            >
                &larr; All Artists
            </Link>

            <div className="mt-8 flex flex-col items-center gap-10 text-center sm:flex-row sm:items-start sm:text-left">
                <CloudinaryImage
                    src={artist.photoUrl}
                    alt={artist.name}
                    sizes="144px"
                    className="h-36 w-36 flex-none rounded-full border-2 border-accent"
                    fallback={
                        <div className="flex h-36 w-36 flex-none items-center justify-center rounded-full border-2 border-accent bg-muted text-3xl font-semibold text-accent">
                            {artist.name
                                .split(" ")
                                .filter(Boolean)
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                        </div>
                    }
                />
                <div>
                    <span className="font-script text-2xl text-lacquer">Meet</span>
                    <h1 className="mt-1 font-serif text-4xl font-extrabold text-foreground sm:text-5xl">
                        {artist.name}
                    </h1>
                    {artist.bio && (
                        <p className="mt-4 max-w-xl text-base leading-relaxed text-body">
                            {artist.bio}
                        </p>
                    )}
                    <CallToBook
                        label={`Call to Book ${artist.name.split(" ")[0]}`}
                        size="lg"
                        className="mt-6"
                    />
                </div>
            </div>

            <h2 className="mt-16 font-serif text-3xl font-extrabold text-foreground">Portfolio</h2>
            <DecoDivider className="mt-2 text-primary" />
            <div className="mt-8">
                <PortfolioGallery images={artist.portfolio} artistName={artist.name} />
            </div>
        </div>
    )
}
