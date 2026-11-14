"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ProfileForm, type ProfileFormValues } from "./profile-form"
import { useToast } from "@/components/ui/toast"

export function MyProfileForm({ initial }: { initial: ProfileFormValues }) {
    const router = useRouter()
    const { update } = useSession()
    const [values, setValues] = useState(initial)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const toast = useToast()
    const [pendingEmail, setPendingEmail] = useState<string | null>(null)
    const [formKey, setFormKey] = useState(0)

    async function handleSave(next: ProfileFormValues) {
        setError(null)
        setSuccess(false)
        setPendingEmail(null)

        try {
            const res = await fetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(next),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't save changes. Please try again.")
                return
            }

            const body = await res.json()
            setValues({
                name: body.data.name ?? "",
                email: body.data.email,
                phone: body.data.phone,
            })
            setPendingEmail(body.data.pendingEmail ?? null)
            setFormKey((key) => key + 1)
            setSuccess(true)
            if (!body.data.pendingEmail) toast("Profile updated.")

            await update({})

            router.refresh()
        } catch {
            setError("Network error. Please try again.")
        }
    }

    return (
        <div>
            <h2 className="mb-5 font-serif text-2xl font-extrabold text-foreground">
                Profile Details
            </h2>
            {error && (
                <p role="alert" className="mb-3 text-sm text-danger">
                    {error}
                </p>
            )}
            {success && !error && pendingEmail && (
                <p role="status" className="mb-3 text-sm text-accent">
                    {`Saved. We sent a link to ${pendingEmail} — your email changes once you click it.`}
                </p>
            )}
            <ProfileForm
                key={formKey}
                initial={values}
                submitLabel="Save Changes"
                onSubmit={handleSave}
                askPasswordOnEmailChange
            />
        </div>
    )
}
