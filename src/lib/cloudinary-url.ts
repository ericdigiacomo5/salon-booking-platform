import { isCloudinaryUrl } from "@/lib/validation"

export function isOwnCloudinaryUrl(value: unknown): value is string {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    return cloudName ? isCloudinaryUrl(value, cloudName) : false
}
