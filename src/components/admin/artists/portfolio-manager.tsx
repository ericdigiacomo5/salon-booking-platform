"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { PortfolioImage } from "@/generated/prisma/client"
import { PhotoUploadField } from "@/components/admin/photo-upload-field"
import { CloudinaryImage } from "@/components/ui/cloudinary-image"

export function PortfolioManager({
    artistId,
    images,
    onImagesChange,
}: {
    artistId: string
    images: PortfolioImage[]
    onImagesChange: (images: PortfolioImage[]) => void
}) {
    const [error, setError] = useState<string | null>(null)

    async function handleUploaded(imageUrl: string) {
        setError(null)

        try {
            const res = await fetch(`/api/admin/artists/${artistId}/portfolio`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl }),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't save that photo. Please try again.")
                return
            }

            const body = await res.json()
            onImagesChange([...images, body.data])
        } catch {
            setError("Network error. Please try again.")
        }
    }

    async function handleDelete(imageId: string) {
        setError(null)

        try {
            const res = await fetch(`/api/admin/artists/${artistId}/portfolio/${imageId}`, {
                method: "DELETE",
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't delete that photo. Please try again.")
                return
            }

            onImagesChange(images.filter((img) => img.id !== imageId))
        } catch {
            setError("Network error. Please try again.")
        }
    }

    return (
        <div className="mt-3 border-t border-border pt-3">
            {error && (
                <p role="alert" className="mb-3 text-sm text-danger">
                    {error}
                </p>
            )}

            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {images.map((image) => (
                        <div key={image.id} className="group relative">
                            <CloudinaryImage
                                src={image.imageUrl}
                                alt={image.caption ?? "Portfolio photo"}
                                sizes="160px"
                                className="aspect-square w-full rounded-sm"
                                fallback={
                                    <div className="flex aspect-square w-full items-center justify-center rounded-sm border border-dashed border-border p-2 text-center text-xs text-muted-foreground">
                                        Image unavailable
                                    </div>
                                }
                            />
                            <button
                                type="button"
                                onClick={() => handleDelete(image.id)}
                                aria-label="Delete photo"
                                className="absolute right-1 top-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-danger"
                            >
                                <X className="h-4 w-4" aria-hidden />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-3">
                <PhotoUploadField label="Add Portfolio Photo" onUploaded={handleUploaded} />
            </div>
        </div>
    )
}
