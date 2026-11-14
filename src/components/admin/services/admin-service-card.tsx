import type { Service } from "@/generated/prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/components/ui/confirm-action"
import { formatDuration, formatPrice } from "@/lib/format"
import type { ServiceCategoryInfo } from "@/lib/service-category"
import { ServiceForm, type ServiceFormValues } from "./service-form"

export type AdminService = Service & { payTerms: { serviceFeeCents: number } | null }

export function AdminServiceCard({
    service,
    categories,
    isEditing,
    onEdit,
    onCancelEdit,
    onSave,
    onToggleActive,
}: {
    service: AdminService
    categories: ServiceCategoryInfo[]
    isEditing: boolean
    onEdit: () => void
    onCancelEdit: () => void
    onSave: (values: ServiceFormValues) => void
    onToggleActive: () => void
}) {
    const categoryName = categories.find((c) => c.id === service.categoryId)?.name ?? "No category"

    if (isEditing) {
        return (
            <ServiceForm
                submitLabel="Save Changes"
                categories={categories}
                initial={{
                    name: service.name,
                    description: service.description ?? "",
                    categoryId: service.categoryId,
                    durationMinutes: service.durationMinutes,
                    priceCents: service.priceCents,
                    serviceFeeCents: service.payTerms?.serviceFeeCents ?? 0,
                }}
                onSubmit={onSave}
                onCancel={onCancelEdit}
            />
        )
    }

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <span className="font-medium text-surface-foreground">{service.name}</span>
                    <Badge tone={service.active ? "success" : "muted"}>
                        {service.active ? "Active" : "Inactive"}
                    </Badge>
                </div>
                {service.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">
                    {`${categoryName} · ${formatDuration(service.durationMinutes)} · ${formatPrice(service.priceCents)}`}
                </p>
                {service.payTerms && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {`Service fee ${formatPrice(service.payTerms.serviceFeeCents)} (charged to the artist)`}
                    </p>
                )}
            </div>

            <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="md" onClick={onEdit}>
                    Edit
                </Button>
                {service.active ? (
                    <ConfirmAction
                        label="Deactivate"
                        prompt={`Take ${service.name} off the menu?`}
                        confirmLabel="Yes, Deactivate"
                        onConfirm={onToggleActive}
                    />
                ) : (
                    <Button variant="secondary" size="md" onClick={onToggleActive}>
                        Reactivate
                    </Button>
                )}
            </div>
        </div>
    )
}
