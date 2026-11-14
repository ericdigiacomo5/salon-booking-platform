import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { CallToBook } from "@/components/ui/call-to-book"

export default function NotFound() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-14">
            <span className="font-script text-2xl text-lacquer">Page not found</span>
            <h1 className="mt-1 font-serif text-4xl font-extrabold leading-tight text-foreground">
                We couldn&apos;t find that page
            </h1>
            <p className="mt-6 text-muted-foreground">
                The link may be out of date, or the page may have been removed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/" className={buttonVariants({ size: "lg" })}>
                    Go Home
                </Link>
                <CallToBook variant="secondary" size="lg" />
            </div>
        </div>
    )
}
