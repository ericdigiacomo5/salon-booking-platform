"use client"

import { useState } from "react"
import { Package } from "lucide-react"
import type { Product } from "@/generated/prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/ui/confirm-action"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { formatPrice } from "@/lib/format"
import { ProductForm, type ProductFormValues } from "./product-form"

export function AdminProductsManager({ initialProducts }: { initialProducts: Product[] }) {
    const [products, setProducts] = useState(initialProducts)
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const toast = useToast()

    async function send(url: string, method: "POST" | "PATCH", body: object) {
        setError(null)
        try {
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
            const json = await res.json().catch(() => null)
            if (!res.ok) {
                setError(json?.error ?? "Something went wrong. Please try again.")
                return null
            }
            return json.data as Product
        } catch {
            setError("Network error. Please try again.")
            return null
        }
    }

    async function handleCreate(values: ProductFormValues) {
        const created = await send("/api/admin/products", "POST", values)
        if (!created) return
        setProducts((prev) => [...prev, created])
        setIsCreating(false)
        toast(`${created.name} added.`)
    }

    async function handleSave(id: string, values: ProductFormValues) {
        const saved = await send(`/api/admin/products/${id}`, "PATCH", values)
        if (!saved) return
        setProducts((prev) => prev.map((p) => (p.id === id ? saved : p)))
        setEditingId(null)
        toast(`${saved.name} saved.`)
    }

    async function handleToggleActive(product: Product) {
        const saved = await send(`/api/admin/products/${product.id}`, "PATCH", {
            active: !product.active,
        })
        if (!saved) return
        setProducts((prev) => prev.map((p) => (p.id === product.id ? saved : p)))
    }

    return (
        <div>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Products</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Retail items sold in the salon. Not shown on the website. Prices are before
                        sales tax.
                    </p>
                </div>
                {!isCreating && (
                    <Button size="md" onClick={() => setIsCreating(true)}>
                        New Product
                    </Button>
                )}
            </div>

            {error && (
                <p role="alert" className="mt-3 text-sm text-danger">
                    {error}
                </p>
            )}

            {isCreating && (
                <div className="mt-4">
                    <ProductForm
                        submitLabel="Create Product"
                        onSubmit={handleCreate}
                        onCancel={() => setIsCreating(false)}
                    />
                </div>
            )}

            {products.length === 0 ? (
                <EmptyState icon={Package} title="No products yet" className="mt-8">
                    Add one with New Product to sell it at checkout or as a retail sale.
                </EmptyState>
            ) : (
                <div className="mt-6 flex flex-col gap-3">
                    {products.map((product) =>
                        editingId === product.id ? (
                            <ProductForm
                                key={product.id}
                                submitLabel="Save Changes"
                                initial={{
                                    name: product.name,
                                    description: product.description ?? "",
                                    priceCents: product.priceCents,
                                }}
                                onSubmit={(values) => handleSave(product.id, values)}
                                onCancel={() => setEditingId(null)}
                            />
                        ) : (
                            <div
                                key={product.id}
                                className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-surface-foreground">
                                            {product.name}
                                        </span>
                                        <Badge tone={product.active ? "success" : "muted"}>
                                            {product.active ? "Active" : "Retired"}
                                        </Badge>
                                    </div>
                                    {product.description && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {product.description}
                                        </p>
                                    )}
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {`${formatPrice(product.priceCents)} before tax`}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button
                                        variant="secondary"
                                        size="md"
                                        onClick={() => setEditingId(product.id)}
                                    >
                                        Edit
                                    </Button>
                                    {product.active ? (
                                        <ConfirmAction
                                            label="Retire"
                                            prompt={`Stop selling ${product.name}?`}
                                            confirmLabel="Yes, Retire"
                                            onConfirm={() => handleToggleActive(product)}
                                        />
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            onClick={() => handleToggleActive(product)}
                                        >
                                            Bring Back
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    )
}
