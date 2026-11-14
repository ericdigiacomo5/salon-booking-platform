export const CATEGORY_COLORS = [
    "gold",
    "blue",
    "green",
    "rose",
    "lavender",
    "peach",
    "teal",
    "lime",
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export const CATEGORY_COLOR_LABEL: Record<CategoryColor, string> = {
    gold: "Gold",
    blue: "Blue",
    green: "Green",
    rose: "Rose",
    lavender: "Lavender",
    peach: "Peach",
    teal: "Teal",
    lime: "Lime",
}

export function isCategoryColor(value: unknown): value is CategoryColor {
    return typeof value === "string" && (CATEGORY_COLORS as readonly string[]).includes(value)
}

export function categoryColorOf(value: string): CategoryColor {
    return isCategoryColor(value) ? value : CATEGORY_COLORS[0]
}

export type ServiceCategoryInfo = {
    id: string
    name: string
    position: number
    color: string
    active: boolean
}

export const CATEGORY_ORDER = [{ position: "asc" as const }, { createdAt: "asc" as const }]

export function compareCategories(
    a: { position: number; name: string },
    b: { position: number; name: string },
): number {
    return a.position - b.position || a.name.localeCompare(b.name)
}

export function cleanCategoryName(name: string): string {
    return name.trim().replace(/\s+/g, " ")
}

export function moveCategory(ids: string[], id: string, direction: "up" | "down"): string[] | null {
    const from = ids.indexOf(id)
    const to = direction === "up" ? from - 1 : from + 1
    if (from === -1 || to < 0 || to >= ids.length) return null
    const next = [...ids]
    ;[next[from], next[to]] = [next[to], next[from]]
    return next
}

export function isCompleteOrder(order: unknown, ids: string[]): order is string[] {
    return (
        Array.isArray(order) &&
        order.length === ids.length &&
        new Set(order).size === order.length &&
        order.every((id) => typeof id === "string" && ids.includes(id))
    )
}
