import type { Role } from "@/generated/prisma/client"

declare module "@auth/core/types" {
    interface User {
        role: Role
        profileIncomplete?: boolean
        emailUnverified?: boolean
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        id: string
        role: Role
        profileIncomplete?: boolean
        emailUnverified?: boolean
        authTime?: number
    }
}
