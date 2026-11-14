import Image from "next/image"
import type { ReactNode } from "react"
import { isCloudinaryUrl } from "@/lib/validation"

export function CloudinaryImage({
    src,
    alt,
    sizes,
    className = "",
    fallback = null,
}: {
    src: string | null | undefined
    alt: string
    sizes: string
    className?: string
    fallback?: ReactNode
}) {
    if (!src || !isCloudinaryUrl(src)) return <>{fallback}</>

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
        </div>
    )
}
