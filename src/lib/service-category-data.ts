import { prisma } from "@/lib/prisma"

export async function categoryNameTaken(name: string, exceptId?: string): Promise<boolean> {
    const existing = await prisma.serviceCategory.findFirst({
        where: {
            name: { equals: name, mode: "insensitive" },
            ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { id: true },
    })
    return existing !== null
}

export async function serviceCategoryError(
    categoryId: unknown,
    options: { serviceActive: boolean; unchanged?: boolean },
): Promise<string | null> {
    if (typeof categoryId !== "string" || categoryId === "") return "Category is required"
    const category = await prisma.serviceCategory.findUnique({
        where: { id: categoryId },
        select: { name: true, active: true },
    })
    if (!category) return "Category is invalid"
    if (category.active) return null
    if (options.unchanged && !options.serviceActive) return null
    return `${category.name} is a retired category. Choose another, or restore ${category.name} first.`
}
