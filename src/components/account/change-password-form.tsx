"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { PASSWORD_MIN_LENGTH } from "@/lib/password"

export function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [pending, setPending] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        if (newPassword !== confirmPassword) {
            setError("New passwords don't match.")
            return
        }

        setPending(true)
        try {
            const res = await fetch("/api/users/me/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't change your password. Please try again.")
                setPending(false)
                return
            }
            await signOut({ redirectTo: "/login?reset=1" })
        } catch {
            setError("Network error. Please try again.")
            setPending(false)
        }
    }

    const labelClass =
        "block font-jost text-xs font-semibold uppercase tracking-wide text-muted-foreground"
    const inputClass =
        "mt-1.5 h-12 w-full rounded-sm border border-foreground bg-background px-4 text-foreground"

    return (
        <section className="mt-12">
            <h2 className="mb-5 font-serif text-2xl font-extrabold text-foreground">Password</h2>
            <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-card"
            >
                <div>
                    <label htmlFor="current-password" className={labelClass}>
                        Current Password
                    </label>
                    <input
                        id="current-password"
                        type="password"
                        required
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label htmlFor="new-password" className={labelClass}>
                        New Password
                    </label>
                    <input
                        id="new-password"
                        type="password"
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClass}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        {`At least ${PASSWORD_MIN_LENGTH} characters. You'll be signed out everywhere and asked to sign in again.`}
                    </p>
                </div>
                <div>
                    <label htmlFor="confirm-new-password" className={labelClass}>
                        Confirm New Password
                    </label>
                    <input
                        id="confirm-new-password"
                        type="password"
                        required
                        minLength={PASSWORD_MIN_LENGTH}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClass}
                    />
                </div>
                {error && (
                    <p role="alert" className="text-sm text-danger">
                        {error}
                    </p>
                )}
                <div>
                    <Button type="submit" disabled={pending}>
                        {pending ? "Saving..." : "Change Password"}
                    </Button>
                </div>
            </form>
        </section>
    )
}
