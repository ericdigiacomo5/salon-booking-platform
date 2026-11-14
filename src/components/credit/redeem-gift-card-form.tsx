"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { formatSalonDate } from "@/lib/salon-time"
import type { GiftCardRow } from "@/lib/credit-shared"

export function RedeemGiftCardForm({
    userId,
    defaultName,
    onRedeemed,
}: {
    userId: string
    defaultName: string
    onRedeemed: (addedCents: number) => void
}) {
    const [name, setName] = useState(defaultName)
    const [matches, setMatches] = useState<GiftCardRow[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        if (name.trim().length < 2) return
        setError(null)
        setSuccess(null)
        setBusy(true)
        try {
            const res = await fetch(
                `/api/admin/gift-cards/redeem?name=${encodeURIComponent(name.trim())}`,
            )
            const body = await res.json().catch(() => null)
            if (!res.ok) {
                setError(body?.error ?? "Couldn't search gift certificates. Please try again.")
                return
            }
            setMatches(body.data)
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusy(false)
        }
    }

    async function handleRedeem(card: GiftCardRow) {
        setError(null)
        setSuccess(null)
        setBusy(true)
        try {
            const res = await fetch("/api/admin/gift-cards/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ giftCardId: card.id, userId }),
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) {
                setError(body?.error ?? "Couldn't redeem that gift certificate. Please try again.")
                return
            }
            setMatches((prev) => (prev ? prev.filter((c) => c.id !== card.id) : prev))
            setSuccess(
                `${formatPrice(body.data.addedCents)} added. New balance: ${formatPrice(body.data.balanceCents)}.`,
            )
            onRedeemed(body.data.addedCents)
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <form onSubmit={handleSearch} className="flex flex-col gap-2">
                <label
                    htmlFor="gift-card-recipient-search"
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Redeem a gift certificate — recipient&apos;s name as written on it
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        id="gift-card-recipient-search"
                        type="search"
                        autoComplete="off"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value)
                            setMatches(null)
                            setSuccess(null)
                        }}
                        disabled={busy}
                        className="h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground"
                    />
                    <Button
                        type="submit"
                        variant="secondary"
                        size="md"
                        disabled={busy || name.trim().length < 2}
                        className="shrink-0"
                    >
                        Find Certificates
                    </Button>
                </div>
            </form>

            {matches !== null &&
                (matches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No unredeemed gift certificates for that name. Try part of the name, or
                        check the Gift Cards page.
                    </p>
                ) : (
                    <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
                        {matches.map((card) => (
                            <li
                                key={card.id}
                                className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-medium text-foreground">
                                        {`${formatPrice(card.valueCents)} for ${card.recipientName ?? "—"}`}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {`Sold ${formatSalonDate(card.issuedAt, { month: "short", day: "numeric", year: "numeric" })}${card.purchaserName ? ` · from ${card.purchaserName}` : ""}`}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="md"
                                    disabled={busy}
                                    onClick={() => handleRedeem(card)}
                                    className="shrink-0"
                                >
                                    {`Add ${formatPrice(card.valueCents)}`}
                                </Button>
                            </li>
                        ))}
                    </ul>
                ))}

            {error && (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            )}
            {success && (
                <p role="status" className="text-sm text-success">
                    {success}
                </p>
            )}
        </div>
    )
}
