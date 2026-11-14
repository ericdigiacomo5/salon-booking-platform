"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { ResendVerificationButton } from "@/components/auth/resend-verification-button"

export function ProfileBanner() {
    const pathname = usePathname()
    const { data: session } = useSession()

    if (!session?.user || pathname === "/verify-email") return null

    if (session.user.emailUnverified) {
        return (
            <BannerShell>
                <span>
                    Confirm your email to get appointment emails
                    <span className="hidden sm:inline">{` — we sent a link to ${session.user.email}`}</span>
                    .
                </span>
                <ResendVerificationButton />
            </BannerShell>
        )
    }

    if (!session.user.profileIncomplete || pathname === "/account") return null

    return (
        <BannerShell>
            <span>
                Add your name and phone
                <span className="hidden sm:inline">
                    {" "}
                    so the salon can reach you about your bookings
                </span>
                .
            </span>
            <Link
                href="/account"
                className="inline-flex h-11 items-center font-semibold text-accent underline underline-offset-2"
            >
                Complete your profile
            </Link>
        </BannerShell>
    )
}

function BannerShell({ children }: { children: React.ReactNode }) {
    return (
        <div role="status" className="border-b border-line bg-primary/10 print:hidden">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 text-[13px] text-foreground sm:text-sm">
                {children}
            </div>
        </div>
    )
}
