"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { formatTaxRate, percentToMillipercent } from "@/lib/retail"

export function RetailTaxSettingsForm({ initialMillipercent }: { initialMillipercent: number }) {
    const [saved, setSaved] = useState(initialMillipercent)
    const [text, setText] = useState(String(initialMillipercent / 1000))
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const toast = useToast()

    const parsed = percentToMillipercent(text)
    const invalid = parsed === null
    const dirty = parsed !== saved

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (invalid) return
        setError(null)
        setPending(true)
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ retailTaxRateMillipercent: parsed }),
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) {
                setError(body?.error ?? "Something went wrong. Please try again.")
                return
            }
            setSaved(body.data.retailTaxRateMillipercent)
            toast(`Sales tax set to ${formatTaxRate(body.data.retailTaxRateMillipercent)}.`)
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setPending(false)
        }
    }

    return (
        <form
            onSubmit={handleSave}
            className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm"
        >
            <div>
                <span className="font-medium text-surface-foreground">Retail Sales Tax</span>
                <p className="mt-1 text-sm text-muted-foreground">
                    {`Added to product sales: ${formatTaxRate(saved)} now. Services aren't taxed. Each sale keeps the rate it was charged at. Check the rate with the salon's accountant.`}
                </p>
            </div>
            <div className="flex flex-wrap items-end gap-4">
                <label className="text-xs font-medium text-muted-foreground">
                    Sales tax (%)
                    <input
                        inputMode="decimal"
                        required
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        aria-invalid={invalid}
                        className="mt-1 block h-11 w-28 rounded-sm border border-border bg-background px-3 text-sm text-foreground"
                    />
                </label>
                <Button
                    type="submit"
                    variant="secondary"
                    size="md"
                    disabled={pending || invalid || !dirty}
                >
                    {pending ? "Saving..." : "Save"}
                </Button>
            </div>
            {invalid && (
                <p className="text-sm text-danger">
                    Enter a percentage from 0 to 25, up to three decimals (e.g. 8.625).
                </p>
            )}
            {error && (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            )}
        </form>
    )
}
