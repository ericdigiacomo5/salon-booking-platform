import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { MAX_PRODUCT_PRICE_CENTS } from "@/lib/retail"
import { TEXT_LIMITS } from "@/lib/validation"

export type ProductFormValues = {
    name: string
    description: string
    priceCents: number
}

export function ProductForm({
    initial,
    submitLabel,
    onSubmit,
    onCancel,
}: {
    initial?: ProductFormValues
    submitLabel: string
    onSubmit: (values: ProductFormValues) => void
    onCancel: () => void
}) {
    const [name, setName] = useState(initial?.name ?? "")
    const [description, setDescription] = useState(initial?.description ?? "")
    const [priceDollars, setPriceDollars] = useState(
        initial ? String(initial.priceCents / 100) : "",
    )

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        onSubmit({ name, description, priceCents: Math.round(Number(priceDollars) * 100) })
    }

    const idPrefix = initial ? "product-edit" : "product-new"

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 shadow-sm"
        >
            <div>
                <label
                    htmlFor={`${idPrefix}-name`}
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Name
                </label>
                <input
                    id={`${idPrefix}-name`}
                    required
                    maxLength={TEXT_LIMITS.serviceName}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground"
                />
            </div>

            <div>
                <label
                    htmlFor={`${idPrefix}-description`}
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Description (optional, staff only)
                </label>
                <textarea
                    id={`${idPrefix}-description`}
                    maxLength={TEXT_LIMITS.description}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
            </div>

            <div>
                <label
                    htmlFor={`${idPrefix}-price`}
                    className="block text-xs font-medium text-muted-foreground"
                >
                    Price before tax (USD)
                </label>
                <input
                    id={`${idPrefix}-price`}
                    type="number"
                    min={0}
                    max={MAX_PRODUCT_PRICE_CENTS / 100}
                    step={0.01}
                    required
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    className="mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground sm:w-40"
                />
            </div>

            <div className="flex gap-2">
                <Button type="submit">{submitLabel}</Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
