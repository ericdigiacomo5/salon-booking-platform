"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { CATEGORY_BLOCK_COLOR } from "@/components/admin/appointment-shared"
import { categoryColorOf, moveCategory, type ServiceCategoryInfo } from "@/lib/service-category"
import { CategoryForm, type CategoryFormValues } from "./category-form"

export function ServiceCategoriesPanel({
    categories,
    onCategoriesChange,
    activeServiceCounts,
}: {
    categories: ServiceCategoryInfo[]
    onCategoriesChange: (categories: ServiceCategoryInfo[]) => void
    activeServiceCounts: Record<string, number>
}) {
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const toast = useToast()

    async function send<T>(url: string, method: "POST" | "PATCH" | "PUT", body: object) {
        setError(null)
        setBusy(true)
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
            return json.data as T
        } catch {
            setError("Network error. Please try again.")
            return null
        } finally {
            setBusy(false)
        }
    }

    function replace(updated: ServiceCategoryInfo) {
        onCategoriesChange(categories.map((c) => (c.id === updated.id ? updated : c)))
    }

    async function handleCreate(values: CategoryFormValues) {
        const created = await send<ServiceCategoryInfo>(
            "/api/admin/service-categories",
            "POST",
            values,
        )
        if (!created) return
        onCategoriesChange([...categories, created])
        setIsCreating(false)
        toast(`${created.name} added. Choose it when adding or editing a service.`)
    }

    async function handleSave(id: string, values: CategoryFormValues) {
        const saved = await send<ServiceCategoryInfo>(
            `/api/admin/service-categories/${id}`,
            "PATCH",
            values,
        )
        if (!saved) return
        replace(saved)
        setEditingId(null)
        toast(`${saved.name} saved.`)
    }

    async function handleMove(id: string, direction: "up" | "down") {
        const order = moveCategory(
            categories.map((c) => c.id),
            id,
            direction,
        )
        if (!order) return
        const saved = await send<ServiceCategoryInfo[]>(
            "/api/admin/service-categories/order",
            "PUT",
            { order },
        )
        if (saved) onCategoriesChange(saved)
    }

    async function handleSetActive(category: ServiceCategoryInfo, active: boolean) {
        const onMenu = activeServiceCounts[category.id] ?? 0
        if (!active && onMenu > 0) {
            setError(
                `${category.name} still has ${onMenu === 1 ? "1 service" : `${onMenu} services`} on the menu. Move them to another category or deactivate them first.`,
            )
            return
        }
        const saved = await send<ServiceCategoryInfo>(
            `/api/admin/service-categories/${category.id}`,
            "PATCH",
            { active },
        )
        if (!saved) return
        replace(saved)
        toast(active ? `${saved.name} restored.` : `${saved.name} retired.`)
    }

    return (
        <section aria-labelledby="categories-heading">
            <div className="flex items-center justify-between gap-3">
                <h2 id="categories-heading" className="text-lg font-semibold text-foreground">
                    Categories
                </h2>
                {!isCreating && (
                    <Button size="md" variant="secondary" onClick={() => setIsCreating(true)}>
                        New Category
                    </Button>
                )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
                The headings on the services menu, in this order. Each one&apos;s color marks its
                appointments on the schedule.
            </p>

            {error && (
                <p role="alert" className="mt-3 text-sm text-danger">
                    {error}
                </p>
            )}

            {isCreating && (
                <div className="mt-4">
                    <CategoryForm
                        idPrefix="new-category"
                        submitLabel="Add Category"
                        onSubmit={handleCreate}
                        onCancel={() => setIsCreating(false)}
                    />
                </div>
            )}

            <ul className="mt-4 flex flex-col gap-2">
                {categories.map((category, index) => {
                    if (editingId === category.id) {
                        return (
                            <li key={category.id}>
                                <CategoryForm
                                    idPrefix={`category-${category.id}`}
                                    initial={category}
                                    submitLabel="Save Changes"
                                    onSubmit={(values) => handleSave(category.id, values)}
                                    onCancel={() => setEditingId(null)}
                                />
                            </li>
                        )
                    }

                    const swatch = CATEGORY_BLOCK_COLOR[categoryColorOf(category.color)]
                    const onMenu = activeServiceCounts[category.id] ?? 0
                    return (
                        <li
                            key={category.id}
                            className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-3 py-2 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className={`h-6 w-6 shrink-0 rounded-sm border ${swatch.block} ${swatch.blockBorder}`}
                                    aria-hidden
                                />
                                <span className="truncate font-medium text-surface-foreground">
                                    {category.name}
                                </span>
                                {category.active ? (
                                    <span className="shrink-0 text-sm text-muted-foreground">
                                        {onMenu === 1 ? "1 service" : `${onMenu} services`}
                                    </span>
                                ) : (
                                    <Badge tone="muted">Retired</Badge>
                                )}
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-1">
                                <Button
                                    variant="ghost"
                                    className="w-11 px-0"
                                    aria-label={`Move ${category.name} up`}
                                    disabled={busy || index === 0}
                                    onClick={() => handleMove(category.id, "up")}
                                >
                                    <ChevronUp className="h-5 w-5" aria-hidden />
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-11 px-0"
                                    aria-label={`Move ${category.name} down`}
                                    disabled={busy || index === categories.length - 1}
                                    onClick={() => handleMove(category.id, "down")}
                                >
                                    <ChevronDown className="h-5 w-5" aria-hidden />
                                </Button>
                                <Button
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() => {
                                        setError(null)
                                        setEditingId(category.id)
                                    }}
                                >
                                    Edit
                                </Button>
                                {category.active ? (
                                    <Button
                                        variant="quiet"
                                        disabled={busy}
                                        onClick={() => handleSetActive(category, false)}
                                    >
                                        Retire
                                    </Button>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        disabled={busy}
                                        onClick={() => handleSetActive(category, true)}
                                    >
                                        Restore
                                    </Button>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
        </section>
    )
}
