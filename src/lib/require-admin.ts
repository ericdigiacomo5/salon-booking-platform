import { auth } from "@/auth"

export async function requireAdmin() {
    const session = await auth()

    if (!session?.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    return null
}

export async function requireAdminId(): Promise<Response | string> {
    const session = await auth()

    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
        return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    return session.user.id
}
