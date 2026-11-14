import Image from "next/image"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CallToBook } from "@/components/ui/call-to-book"
import { BOOKING_PHONE, formatPhone } from "@/lib/site"
import { ServiceCard } from "@/components/services/service-card"
import { ArtistCarousel } from "@/components/artists/artist-carousel"
import { formatOpening } from "@/lib/format"
import { CloudinaryImage } from "@/components/ui/cloudinary-image"
import { Reveal } from "@/components/ui/reveal"
import { SectionHeading } from "@/components/ui/section-heading"
import { DecoDivider, DecoFrame } from "@/components/ui/deco"
import { loadArtistCards } from "@/lib/artist-cards"
import { isCloudinaryUrl } from "@/lib/validation"
import heroPhoto from "../../public/hero.jpg"

const FRESH_WORK = 8

export default async function Home() {
    const [services, artists, recentWork] = await Promise.all([
        prisma.service.findMany({
            where: { active: true },
            take: 3,
            orderBy: { createdAt: "asc" },
        }),
        loadArtistCards(),
        prisma.portfolioImage.findMany({
            where: { artist: { active: true } },
            include: { artist: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: FRESH_WORK * 2,
        }),
    ])
    const work = recentWork.filter((image) => isCloudinaryUrl(image.imageUrl)).slice(0, FRESH_WORK)

    return (
        <div className="flex flex-col">
            <section className="hero-stripes relative overflow-hidden">
                <Image
                    src={heroPhoto}
                    alt=""
                    fill
                    priority
                    placeholder="blur"
                    sizes="100vw"
                    className="object-cover"
                />
                <div className="hero-wash absolute inset-0" />
                <span className="text-primary">
                    <DecoFrame className="inset-3 sm:inset-6" />
                </span>

                <div className="relative z-1 mx-auto w-full max-w-6xl px-8 py-20 sm:px-12 sm:py-32">
                    <div className="max-w-xl">
                        <span className="inline-block -rotate-3 font-script text-2xl text-primary sm:text-3xl">
                            Est. 2020
                        </span>
                        <div className="mt-3 h-0.5 w-17.5 bg-primary" />
                        <h1 className="mt-5 font-serif text-4xl font-extrabold leading-[1.02] tracking-wide text-background sm:text-6xl">
                            Nail Care
                            <br />
                            in Anytown
                        </h1>
                        <p className="mt-5 max-w-md text-[17px] leading-relaxed text-on-dark">
                            {
                                "Gel manicures, pedicures, waxing and nail art on Main Street. Call or stop by to book with any of our artists."
                            }
                        </p>
                        <div
                            className="twinkle mt-5 text-sm tracking-[8px] text-primary"
                            aria-hidden
                        >
                            <span>&#9733;</span> <span>&#9733;</span> <span>&#9733;</span>
                        </div>
                        <div className="mt-7 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row">
                            <CallToBook size="lg" className="w-full sm:w-auto" />
                            <Link
                                href="/artists"
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-primary bg-transparent px-6 font-jost text-base font-semibold uppercase tracking-wide text-background transition-colors hover:bg-background/10 sm:w-auto"
                            >
                                See Our Work
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {work.length > 0 && (
                <Reveal>
                    <section
                        aria-labelledby="fresh-work"
                        className="mx-auto w-full max-w-6xl px-4 py-16"
                    >
                        <SectionHeading
                            id="fresh-work"
                            kicker="Fresh from"
                            title="The Studio"
                            link={{ href: "/artists", label: "All artists" }}
                        />
                        <ul className="-mx-4 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
                            {work.map((image) => (
                                <li
                                    key={image.id}
                                    className="w-[70%] shrink-0 snap-start sm:w-[40%] md:w-auto"
                                >
                                    <Link
                                        href={`/artists/${image.artist.id}`}
                                        className="group block"
                                    >
                                        <CloudinaryImage
                                            src={image.imageUrl}
                                            alt={image.caption ?? `Nails by ${image.artist.name}`}
                                            sizes="(min-width: 768px) 25vw, 70vw"
                                            className="aspect-square w-full rounded-xl shadow-card transition duration-300 motion-safe:group-hover:scale-[1.02] group-hover:shadow-raised"
                                        />
                                        <span className="mt-2 block text-sm text-muted-foreground group-hover:text-primary-strong">
                                            by {image.artist.name}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                </Reveal>
            )}

            {services.length > 0 && (
                <div className="band border-y border-line">
                    <Reveal>
                        <section className="mx-auto w-full max-w-6xl px-4 py-16">
                            <SectionHeading
                                kicker="Our most-loved"
                                title="Services"
                                link={{ href: "/services", label: "Full menu" }}
                            />
                            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
                                {services.map((service) => (
                                    <ServiceCard key={service.id} service={service} />
                                ))}
                            </div>
                        </section>
                    </Reveal>
                </div>
            )}

            {artists.length > 0 && (
                <Reveal>
                    <section className="mx-auto w-full max-w-6xl px-4 py-16">
                        <SectionHeading
                            kicker="The talent"
                            title="Meet the Artists"
                            link={{ href: "/artists", label: "All artists" }}
                        />
                        <div className="mt-10">
                            <ArtistCarousel
                                artists={artists.map((artist) => ({
                                    id: artist.id,
                                    name: artist.name,
                                    bio: artist.bio,
                                    photoUrl: artist.photoUrl,
                                    specialties: artist.specialties,
                                    nextOpeningLabel: artist.nextOpening
                                        ? `Next opening: ${formatOpening(artist.nextOpening)}`
                                        : "Fully booked for the next two weeks",
                                }))}
                            />
                        </div>
                    </section>
                </Reveal>
            )}

            <section className="bg-primary px-4 py-16 text-center">
                <DecoDivider align="center" className="mb-5 text-foreground" />
                <h2 className="font-serif text-3xl font-extrabold text-foreground">
                    Book your next appointment
                </h2>
                <p className="mt-3 font-script text-2xl text-foreground">
                    {`Call us at ${formatPhone(BOOKING_PHONE)}, or stop by the salon.`}
                </p>
                <CallToBook variant="inverse" size="lg" className="mt-7" />
            </section>
        </div>
    )
}
