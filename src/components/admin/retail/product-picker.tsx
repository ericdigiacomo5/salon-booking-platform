"use client"

import { useState } from "react"
import { Minus, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { MAX_RETAIL_LINES, MAX_RETAIL_QUANTITY } from "@/lib/retail"

export type ProductOption = { id: string; name: string; priceCents: number }

export type PickedProduct = { productId: string; quantity: number }

export function ProductPicker({
    products,
    value,
    onChange,
    disabled = false,
    idPrefix,
}: {
    products: ProductOption[]
    value: PickedProduct[]
    onChange: (next: PickedProduct[]) => void
    disabled?: boolean
    idPrefix: string
}) {
    const available = products.filter((p) => !value.some((line) => line.productId === p.id))
    const [choice, setChoice] = useState("")
    const selected = available.some((p) => p.id === choice) ? choice : (available[0]?.id ?? "")

    function setQuantity(productId: string, quantity: number) {
        onChange(
            value.map((line) =>
                line.productId === productId
                    ? { ...line, quantity: Math.min(MAX_RETAIL_QUANTITY, Math.max(1, quantity)) }
                    : line,
            ),
        )
    }

    if (products.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No products yet. Add them under Catalog → Products.
            </p>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            {value.length > 0 && (
                <ul className="flex flex-col divide-y divide-line rounded-sm border border-border">
                    {value.map((line) => {
                        const product = products.find((p) => p.id === line.productId)
                        if (!product) return null
                        return (
                            <li key={line.productId} className="flex items-center gap-2 px-2 py-1">
                                <span className="min-w-0 flex-1 text-sm text-foreground">
                                    {product.name}
                                    <span className="block text-xs text-muted-foreground">
                                        {`${formatPrice(product.priceCents)} each · ${formatPrice(product.priceCents * line.quantity)}`}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    aria-label={`One fewer ${product.name}`}
                                    disabled={disabled || line.quantity <= 1}
                                    onClick={() => setQuantity(line.productId, line.quantity - 1)}
                                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Minus className="h-4 w-4" aria-hidden />
                                </button>
                                <span
                                    aria-label={`Quantity of ${product.name}`}
                                    className="w-6 text-center text-sm font-medium tabular-nums"
                                >
                                    {line.quantity}
                                </span>
                                <button
                                    type="button"
                                    aria-label={`One more ${product.name}`}
                                    disabled={disabled || line.quantity >= MAX_RETAIL_QUANTITY}
                                    onClick={() => setQuantity(line.productId, line.quantity + 1)}
                                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Plus className="h-4 w-4" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Remove ${product.name}`}
                                    disabled={disabled}
                                    onClick={() =>
                                        onChange(
                                            value.filter((l) => l.productId !== line.productId),
                                        )
                                    }
                                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-danger disabled:cursor-not-allowed"
                                >
                                    <X className="h-4 w-4" aria-hidden />
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}

            {available.length > 0 && value.length < MAX_RETAIL_LINES && (
                <div className="flex gap-2">
                    <label htmlFor={`${idPrefix}-product`} className="sr-only">
                        Product to add
                    </label>
                    <select
                        id={`${idPrefix}-product`}
                        value={selected}
                        onChange={(e) => setChoice(e.target.value)}
                        disabled={disabled}
                        className="h-11 min-w-0 flex-1 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
                    >
                        {available.map((product) => (
                            <option key={product.id} value={product.id}>
                                {`${product.name} — ${formatPrice(product.priceCents)}`}
                            </option>
                        ))}
                    </select>
                    <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        disabled={disabled || !selected}
                        onClick={() => onChange([...value, { productId: selected, quantity: 1 }])}
                    >
                        Add
                    </Button>
                </div>
            )}
        </div>
    )
}

export function pickedLines(products: ProductOption[], picked: PickedProduct[]) {
    return picked.flatMap((line) => {
        const product = products.find((p) => p.id === line.productId)
        return product ? [{ quantity: line.quantity, unitPriceCents: product.priceCents }] : []
    })
}
