import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { CATEGORY_BLOCK_COLOR } from "@/components/admin/appointment-shared"
import {
    CATEGORY_COLOR_LABEL,
    CATEGORY_COLORS,
    categoryColorOf,
    type CategoryColor,
} from "@/lib/service-category"
import { TEXT_LIMITS } from "@/lib/validation"

export type CategoryFormValues = { name: string; color: CategoryColor }

export function CategoryForm({
    idPrefix,
    initial,
    submitLabel,
    onSubmit,
    onCancel,
}: {
    idPrefix: string
    initial?: { name: string; color: string }
    submitLabel: string
    onSubmit: (values: CategoryFormValues) => void
    onCancel: () => void
}) {
    const [name, setName] = useState(initial?.name ?? "")
    const [color, setColor] = useState<CategoryColor>(
        initial ? categoryColorOf(initial.color) : CATEGORY_COLORS[0],
    )

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        onSubmit({ name, color })
    }

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
                    Category name
                </label>
                <input
                    id={`${idPrefix}-name`}
                    required
                    maxLength={TEXT_LIMITS.categoryName}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Lashes"
                    className="mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground sm:w-80"
                />
            </div>

            <fieldset>
                <legend className="block text-xs font-medium text-muted-foreground">
                    Schedule color
                </legend>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {CATEGORY_COLORS.map((key) => {
                        const swatch = CATEGORY_BLOCK_COLOR[key]
                        return (
                            <label
                                key={key}
                                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1 text-xs text-foreground has-[:checked]:border-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent sm:min-w-24"
                            >
                                <input
                                    type="radio"
                                    name={`${idPrefix}-color`}
                                    value={key}
                                    checked={color === key}
                                    onChange={() => setColor(key)}
                                    className="sr-only"
                                />
                                <span
                                    className={`h-6 w-6 shrink-0 rounded-sm border ${swatch.block} ${swatch.blockBorder}`}
                                    aria-hidden
                                />
                                {CATEGORY_COLOR_LABEL[key]}
                            </label>
                        )
                    })}
                </div>
            </fieldset>

            <div className="flex gap-2">
                <Button type="submit">{submitLabel}</Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
