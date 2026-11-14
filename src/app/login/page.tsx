import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/login-form"
import { safeCallbackUrl } from "@/lib/validation"
import { BOOKING_PHONE, formatPhone } from "@/lib/site"

export const metadata: Metadata = { title: "Sign In" }

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string; reset?: string }>
}) {
    const params = await searchParams
    const callbackUrl = safeCallbackUrl(params.callbackUrl)

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 py-12">
            <div className="w-full text-center">
                <span className="font-script text-2xl text-lacquer">Welcome Back,</span>
                <h1 className="mt-1 font-serif text-4xl font-extrabold text-foreground">Sign In</h1>
            </div>
            {params.reset && (
                <p className="mt-4 w-full rounded-sm bg-success/10 px-3 py-2 text-center text-sm text-success">
                    Password updated — sign in with your new password.
                </p>
            )}
            <div className="mt-8 w-full">
                <LoginForm callbackUrl={callbackUrl} />
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
                {`Don't have an account? Ask us at your next visit, or call ${formatPhone(BOOKING_PHONE)}, and we'll email you an invite.`}
            </p>
        </div>
    )
}
