import { Phone } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { BOOKING_PHONE } from "@/lib/site"

type Variant = NonNullable<Parameters<typeof buttonVariants>[0]>["variant"]
type Size = NonNullable<Parameters<typeof buttonVariants>[0]>["size"]

export function CallToBook({
    label = "Call to Book",
    variant = "gold",
    size = "md",
    className = "",
    showIcon = true,
}: {
    label?: string
    variant?: Variant
    size?: Size
    className?: string
    showIcon?: boolean
}) {
    return (
        <a href={`tel:${BOOKING_PHONE}`} className={buttonVariants({ variant, size, className })}>
            {showIcon && <Phone className="h-4 w-4" aria-hidden />}
            {label}
        </a>
    )
}
