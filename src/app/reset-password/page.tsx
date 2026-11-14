import type { Metadata } from "next"
import Link from "next/link"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = { title: "Choose a Password" }

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string; invite?: string }>
}) {
    const { token, invite } = await searchParams
    const isInvite = invite === "1"

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 py-12">
            <div className="w-full text-center">
                <span className="font-script text-2xl text-lacquer">
                    {isInvite ? "Welcome! Choose a" : "Choose a New"}
                </span>
                <h1 className="mt-1 font-serif text-4xl font-extrabold text-foreground">
                    Password
                </h1>
                {isInvite && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        Then sign in to see your appointments.
                    </p>
                )}
            </div>
            <div className="mt-8 w-full">
                {token ? (
                    <ResetPasswordForm token={token} />
                ) : (
                    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-8 shadow-raised text-center">
                        <p className="text-sm text-danger">This link is invalid or has expired.</p>
                        {isInvite ? (
                            <p className="text-sm text-muted-foreground">
                                Please ask the salon to send you a new invite.
                            </p>
                        ) : (
                            <Link
                                href="/forgot-password"
                                className="text-sm font-semibold text-accent hover:text-primary-strong"
                            >
                                Request a new link
                            </Link>
                        )}
                    </div>
                )}
                {token && isInvite && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Link expired? Ask the salon to send you a new invite.
                    </p>
                )}
            </div>
        </div>
    )
}
