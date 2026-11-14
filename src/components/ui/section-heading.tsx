import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { DecoDivider } from "@/components/ui/deco"

export function SectionHeading({
    id,
    kicker,
    title,
    link,
    as: Tag = "h2",
}: {
    id?: string
    kicker: string
    title: string
    link?: { href: string; label: string }
    as?: "h1" | "h2"
}) {
    return (
        <div className="flex items-end justify-between gap-4">
            <div>
                <span className="font-script text-2xl text-lacquer">{kicker}</span>
                <Tag
                    id={id}
                    className="mt-0.5 font-serif text-4xl font-extrabold leading-tight text-foreground sm:text-5xl"
                >
                    {title}
                </Tag>
                <DecoDivider className="mt-3 text-primary" />
            </div>
            {link && (
                <Link
                    href={link.href}
                    className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap pb-1 font-semibold text-foreground hover:text-lacquer"
                >
                    {link.label}
                    <ArrowRight
                        className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5"
                        aria-hidden
                    />
                </Link>
            )}
        </div>
    )
}
