import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"

export async function requireAdminPage(callbackPath: string) {
    const session = await auth()

    if (!session?.user) {
        redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`)
    }

    if (session.user.role !== "ADMIN") {
        notFound()
    }

    return session
}
