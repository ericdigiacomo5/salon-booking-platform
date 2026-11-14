import { auth } from "@/auth"

export async function requireUser(): Promise<Response | string> {
    const session = await auth()

    if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    return session.user.id
}
