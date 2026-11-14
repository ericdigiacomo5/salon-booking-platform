export async function resizeImageFile(
    file: File,
    maxDimension: number = 1600,
    quality: number = 0.85,
): Promise<File> {
    const bitmap = await createImageBitmap(file)

    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    if (scale === 1) {
        bitmap.close()
        return file
    }

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext("2d")
    if (!ctx) {
        bitmap.close()
        return file
    }

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
    )

    if (!blob) {
        return file
    }

    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
}
