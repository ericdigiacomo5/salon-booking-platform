"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import type { ServiceCategoryInfo } from "@/lib/service-category"
import { AdminServiceCard, type AdminService } from "./admin-service-card"
import { ServiceForm, type ServiceFormValues } from "./service-form"
import { ServiceCategoriesPanel } from "./service-categories-panel"

export function AdminServicesManager({
    initialServices,
    initialCategories,
}: {
    initialServices: AdminService[]
    initialCategories: ServiceCategoryInfo[]
}) {
    const [services, setServices] = useState(initialServices)
    const [categories, setCategories] = useState(initialCategories)
    const hasActiveCategory = categories.some((c) => c.active)
    const activeServiceCounts: Record<string, number> = {}
    for (const service of services) {
        if (service.active) {
            activeServiceCounts[service.categoryId] =
                (activeServiceCounts[service.categoryId] ?? 0) + 1
        }
    }
    const [isCreating, setIsCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const toast = useToast()

    async function handleCreate(values: ServiceFormValues) {
        setError(null)

        try {
            const res = await fetch("/api/admin/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't create that service. Please try again.")
                return
            }

            const body = await res.json()
            setServices((prev) => [...prev, body.data])
            setIsCreating(false)
            toast(`${body.data.name} added to the menu.`)
        } catch {
            setError("Network error. Please try again.")
        }
    }

    async function handleSaveEdit(id: string, values: ServiceFormValues) {
        setError(null)

        try {
            const res = await fetch(`/api/admin/services/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't save changes. Please try again.")
                return
            }

            const body = await res.json()
            setServices((prev) => prev.map((s) => (s.id === id ? body.data : s)))
            setEditingId(null)
            toast(`${body.data.name} saved.`)
        } catch {
            setError("Network error. Please try again.")
        }
    }

    async function handleToggleActive(service: AdminService) {
        setError(null)

        try {
            const res = service.active
                ? await fetch(`/api/admin/services/${service.id}`, { method: "DELETE" })
                : await fetch(`/api/admin/services/${service.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ active: true }),
                  })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                setError(body?.error ?? "Couldn't update this service. Please try again.")
                return
            }

            const body = await res.json()
            setServices((prev) =>
                prev.map((s) => (s.id === service.id ? { ...s, ...body.data } : s)),
            )
        } catch {
            setError("Network error. Please try again.")
        }
    }

    return (
        <div>
            <ServiceCategoriesPanel
                categories={categories}
                onCategoriesChange={setCategories}
                activeServiceCounts={activeServiceCounts}
            />

            <div className="mt-10 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Services</h2>
                {!isCreating && (
                    <Button
                        size="md"
                        disabled={!hasActiveCategory}
                        onClick={() => setIsCreating(true)}
                    >
                        New Service
                    </Button>
                )}
            </div>
            {!hasActiveCategory && (
                <p className="mt-2 text-sm text-muted-foreground">
                    Add a category above before adding services.
                </p>
            )}

            {error && (
                <p role="alert" className="mt-3 text-sm text-danger">
                    {error}
                </p>
            )}

            {isCreating && (
                <div className="mt-4">
                    <ServiceForm
                        submitLabel="Create Service"
                        categories={categories}
                        onSubmit={handleCreate}
                        onCancel={() => setIsCreating(false)}
                    />
                </div>
            )}

            {services.length === 0 ? (
                <EmptyState icon={Sparkles} title="No services yet" className="mt-8">
                    Add the first one with New Service — it appears on the menu and in booking right
                    away.
                </EmptyState>
            ) : (
                <div className="mt-6 flex flex-col gap-3">
                    {services.map((service) => (
                        <AdminServiceCard
                            key={service.id}
                            service={service}
                            categories={categories}
                            isEditing={editingId === service.id}
                            onEdit={() => setEditingId(service.id)}
                            onCancelEdit={() => setEditingId(null)}
                            onSave={(values) => handleSaveEdit(service.id, values)}
                            onToggleActive={() => handleToggleActive(service)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
