"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { CalendarClock, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { CloudinaryImage } from "@/components/ui/cloudinary-image"
import { CallToBook } from "@/components/ui/call-to-book"

export type CarouselArtist = {
    id: string
    name: string
    bio: string | null
    photoUrl: string | null
    specialties: string[]
    nextOpeningLabel: string
}

const SWIPE_PX = 40

const TILT_DEG = 14
const TILT_SIN = Math.sin((TILT_DEG * Math.PI) / 180)
const TILT_COS = Math.cos((TILT_DEG * Math.PI) / 180)

const AUTO_TURN_MS = 5000
const TICK_MS = 250

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
function subscribeReducedMotion(onChange: () => void) {
    const query = window.matchMedia(REDUCED_MOTION)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches

function initials(name: string) {
    return name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
}

export function ArtistCarousel({ artists }: { artists: CarouselArtist[] }) {
    const [turn, setTurn] = useState(0)
    const swipeStart = useRef<number | null>(null)
    const regionRef = useRef<HTMLDivElement>(null)
    const count = artists.length
    const active = ((turn % count) + count) % count

    const heldByVisitor = useRef(false)

    const go = (delta: number) => {
        heldByVisitor.current = true
        setTurn((t) => t + delta)
    }

    const reducedMotion = useSyncExternalStore(
        subscribeReducedMotion,
        prefersReducedMotion,
        () => false,
    )
    const [paused, setPaused] = useState<boolean | null>(null)
    const isPaused = paused ?? reducedMotion
    const [onScreen, setOnScreen] = useState(false)
    const [tabVisible, setTabVisible] = useState(true)
    const autoTurning = count > 1 && !isPaused && onScreen && tabVisible

    const lastInputWasKeyboard = useRef(false)

    useEffect(() => {
        const onKey = () => (lastInputWasKeyboard.current = true)
        const onPointer = () => (lastInputWasKeyboard.current = false)
        document.addEventListener("keydown", onKey, true)
        document.addEventListener("pointerdown", onPointer, true)
        const onVisibility = () => setTabVisible(document.visibilityState === "visible")
        document.addEventListener("visibilitychange", onVisibility)

        const region = regionRef.current
        const observer =
            region && typeof IntersectionObserver !== "undefined"
                ? new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
                      threshold: 0.4,
                  })
                : null
        if (region) observer?.observe(region)

        return () => {
            observer?.disconnect()
            document.removeEventListener("keydown", onKey, true)
            document.removeEventListener("pointerdown", onPointer, true)
            document.removeEventListener("visibilitychange", onVisibility)
        }
    }, [])

    const [progress, setProgress] = useState({ turn: 0, fraction: 0 })
    useEffect(() => {
        if (!autoTurning) return
        let shownFor = 0
        const tick = setInterval(() => {
            const region = regionRef.current
            const hovered =
                window.matchMedia("(hover: hover)").matches && !!region?.matches(":hover")
            if (heldByVisitor.current && !hovered) heldByVisitor.current = false
            const keyboardFocusInside =
                lastInputWasKeyboard.current && !!region?.contains(document.activeElement)
            if (heldByVisitor.current || keyboardFocusInside) {
                shownFor = 0
                setProgress({ turn, fraction: 0 })
                return
            }
            shownFor += TICK_MS
            setProgress({ turn, fraction: Math.min(1, shownFor / AUTO_TURN_MS) })
            if (shownFor >= AUTO_TURN_MS) setTurn((t) => t + 1)
        }, TICK_MS)
        return () => clearInterval(tick)
    }, [autoTurning, turn])
    const fraction = progress.turn === turn ? progress.fraction : 0

    if (count === 0) return null

    return (
        <div
            ref={regionRef}
            role="region"
            aria-roledescription="carousel"
            aria-label="Our artists"
            className="relative"
            onKeyDown={(e) => {
                if (e.key === "ArrowLeft") go(-1)
                if (e.key === "ArrowRight") go(1)
            }}
        >
            <p className="sr-only" aria-live={autoTurning ? "off" : "polite"}>
                {`${artists[active].name}, ${active + 1} of ${count}`}
            </p>

            <div
                className="relative h-144 overflow-x-clip [--ring-r:150px] perspective-[1100px] sm:[--ring-r:300px] lg:[--ring-r:400px] lg:perspective-[1400px] xl:[--ring-r:500px]"
                onPointerDown={(e) => {
                    swipeStart.current = e.clientX
                }}
                onPointerUp={(e) => {
                    if (swipeStart.current === null) return
                    const travelled = e.clientX - swipeStart.current
                    swipeStart.current = null
                    if (Math.abs(travelled) >= SWIPE_PX) go(travelled < 0 ? 1 : -1)
                }}
            >
                <div
                    className="absolute inset-x-0 top-1 bottom-0 origin-top transform-3d sm:top-2 lg:top-0 xl:top-6"
                    style={{
                        transform: `translateY(calc(-${TILT_SIN} * var(--ring-r))) translateZ(calc(-${TILT_COS} * var(--ring-r))) rotateX(${-TILT_DEG}deg)`,
                    }}
                >
                    {artists.map((artist, i) => {
                        const angle = ((i - turn) * 360) / count
                        const depth = Math.cos((angle * Math.PI) / 180)
                        const isFront = i === active
                        const nearness = isFront ? 1 : (depth + 1) / 2
                        const scale = 0.72 + 0.28 * nearness
                        return (
                            <div
                                key={artist.id}
                                role="group"
                                aria-roledescription="slide"
                                aria-label={`${artist.name}, ${i + 1} of ${count}`}
                                aria-hidden={!isFront}
                                inert={!isFront}
                                className="absolute top-0 left-1/2 w-64 -ml-32 origin-top transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,0.8,0.3,1)] sm:w-72 sm:-ml-36"
                                style={{
                                    transform: `rotateY(${angle}deg) translateZ(var(--ring-r)) rotateY(${-angle}deg) rotateX(${TILT_DEG}deg) translateY(${(1 - scale) * 50}%) scale(${scale})`,
                                    opacity: isFront ? 1 : 0.25 + 0.5 * nearness,
                                    filter: isFront
                                        ? "none"
                                        : `blur(${(1 - nearness) * 3 + 1}px) saturate(0.7)`,
                                    zIndex: Math.round(depth * 100) + 100,
                                }}
                            >
                                <ArtistSlide artist={artist} />
                            </div>
                        )
                    })}
                </div>

                {count > 1 && (
                    <>
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden
                            onClick={() => go(-1)}
                            className="absolute inset-y-0 left-0 z-250 w-[calc(50%-9rem)] cursor-pointer"
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden
                            onClick={() => go(1)}
                            className="absolute inset-y-0 right-0 z-250 w-[calc(50%-9rem)] cursor-pointer"
                        />
                    </>
                )}
            </div>

            {count > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label="Previous artist"
                        className="absolute top-[38%] left-0 z-300 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-foreground shadow-raised transition hover:text-lacquer sm:left-4"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="Next artist"
                        className="absolute top-[38%] right-0 z-300 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-foreground shadow-raised transition hover:text-lacquer sm:right-4"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="mt-2 flex items-center justify-center gap-3">
                        <div className="flex items-center gap-2" aria-hidden>
                            {artists.map((artist, i) =>
                                i === active ? (
                                    <span
                                        key={artist.id}
                                        className={`relative h-2 w-8 overflow-hidden rounded-full transition-[width] duration-500 ${autoTurning ? "bg-lacquer/25" : "bg-lacquer"}`}
                                    >
                                        {autoTurning && (
                                            <span
                                                className="absolute inset-y-0 left-0 rounded-full bg-lacquer transition-[width] duration-250 ease-linear"
                                                style={{ width: `${fraction * 100}%` }}
                                            />
                                        )}
                                    </span>
                                ) : (
                                    <span
                                        key={artist.id}
                                        className="h-2 w-2 rounded-full bg-primary/40 transition-all duration-500"
                                    />
                                ),
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (isPaused) heldByVisitor.current = false
                                setPaused(!isPaused)
                            }}
                            aria-label={
                                isPaused ? "Play automatic rotation" : "Pause automatic rotation"
                            }
                            aria-pressed={isPaused}
                            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            {isPaused ? (
                                <Play className="h-4 w-4" />
                            ) : (
                                <Pause className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

function ArtistSlide({ artist }: { artist: CarouselArtist }) {
    return (
        <div className="flex flex-col items-center">
            <div className="relative z-10 rounded-full bg-surface p-1.5 shadow-raised ring-1 ring-primary/60">
                <CloudinaryImage
                    src={artist.photoUrl}
                    alt={artist.name}
                    sizes="208px"
                    className="h-44 w-44 rounded-full sm:h-52 sm:w-52"
                    fallback={
                        <div className="flex h-44 w-44 items-center justify-center rounded-full bg-muted font-serif text-5xl font-bold text-accent sm:h-52 sm:w-52">
                            {initials(artist.name)}
                        </div>
                    }
                />
            </div>
            <div className="-mt-20 w-full rounded-xl border border-line bg-surface px-6 pt-24 pb-6 text-center shadow-card">
                <h3 className="font-serif text-2xl font-bold text-surface-foreground">
                    {artist.name}
                </h3>
                {artist.bio && (
                    <p className="mt-1 line-clamp-2 text-base leading-relaxed text-body">
                        {artist.bio}
                    </p>
                )}
                {artist.specialties.length > 0 && (
                    <ul
                        className="mt-3 flex flex-wrap justify-center gap-1.5"
                        aria-label="Specialties"
                    >
                        {artist.specialties.map((specialty) => (
                            <li
                                key={specialty}
                                className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-primary-strong ring-1 ring-primary/40"
                            >
                                {specialty}
                            </li>
                        ))}
                    </ul>
                )}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium text-foreground">
                    <CalendarClock className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {artist.nextOpeningLabel}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                    <CallToBook
                        label={`Call to Book ${artist.name.split(" ")[0]}`}
                        className="w-full"
                    />
                    <Link
                        href={`/artists/${artist.id}`}
                        className="inline-flex min-h-11 items-center justify-center font-semibold text-foreground hover:text-lacquer"
                    >
                        See their work
                    </Link>
                </div>
            </div>
        </div>
    )
}
