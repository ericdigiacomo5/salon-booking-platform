import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { BCRYPT_COST } from "@/lib/password"
import { normalizeEmail, UNKNOWN_PHONE } from "@/lib/validation"

const DUMMY_PASSWORD_HASH = "$2b$10$duWU74THNTZm36HrP2HhDueSiNwv2Go7vZOUVWwVzUWd12M.o/4b."
if (bcrypt.getRounds(DUMMY_PASSWORD_HASH) !== BCRYPT_COST) {
    throw new Error(
        "DUMMY_PASSWORD_HASH must use BCRYPT_COST — regenerate it with bcrypt.hashSync(<random>, BCRYPT_COST)",
    )
}

const ABSOLUTE_SESSION_SECONDS = {
    ADMIN: 12 * 60 * 60,
    CUSTOMER: 14 * 24 * 60 * 60,
} as const

export const { handlers, auth, signIn, signOut } = NextAuth({
    session: { strategy: "jwt", maxAge: 60 * 60 * 8 },

    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            async authorize(credentials) {
                const email = normalizeEmail(credentials.email)
                if (!email) {
                    return null
                }

                if (!credentials.password || typeof credentials.password !== "string") {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email },
                })

                const isMatch = await bcrypt.compare(
                    credentials.password,
                    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
                )

                if (!user || !user.passwordHash || !isMatch) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user?.id) {
                token.id = user.id
                token.role = user.role
                token.authTime = Math.floor(Date.now() / 1000)
            }

            if (token.id) {
                const fresh = await prisma.user.findUnique({
                    where: { id: token.id },
                    select: {
                        name: true,
                        email: true,
                        emailVerified: true,
                        phone: true,
                        role: true,
                        passwordChangedAt: true,
                        sessionsRevokedAt: true,
                    },
                })

                if (!fresh) return null

                const revokedAt = Math.max(
                    fresh.passwordChangedAt?.getTime() ?? 0,
                    fresh.sessionsRevokedAt?.getTime() ?? 0,
                )
                if (token.iat && token.iat * 1000 < revokedAt) {
                    return null
                }

                const maxSeconds = ABSOLUTE_SESSION_SECONDS[fresh.role]
                if (!token.authTime || Date.now() / 1000 - token.authTime > maxSeconds) {
                    return null
                }

                token.name = fresh.name
                token.email = fresh.email
                token.role = fresh.role
                token.profileIncomplete = !fresh.name || fresh.phone === UNKNOWN_PHONE
                token.emailUnverified = !fresh.emailVerified
            }

            return token
        },
        async session({ session, token }) {
            session.user.id = token.id
            session.user.role = token.role
            if (token.name) session.user.name = token.name
            if (token.email) session.user.email = token.email
            session.user.profileIncomplete = token.profileIncomplete ?? false
            session.user.emailUnverified = token.emailUnverified ?? false
            return session
        },
    },
})
