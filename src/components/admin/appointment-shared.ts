import type {
    Appointment,
    AppointmentStatus,
    Artist,
    DiscountType,
    PaymentMethod,
    User,
} from "@/generated/prisma/client"
import type { ServiceLine } from "@/lib/appointment-services"
import { CATEGORY_COLORS, type CategoryColor } from "@/lib/service-category"

export type AdminAppointmentUser = Pick<User, "id" | "name" | "email" | "phone">

export type AdminRetailSale = {
    id: string
    discountType: DiscountType | null
    discountValue: number | null
    taxRateMillipercent: number
    taxCents: number
    artist: { id: string; name: string } | null
    items: {
        productId: string
        quantity: number
        unitPriceCents: number
        product: { name: string }
    }[]
}

export type AdminAppointment = Appointment & {
    artist: Artist
    services: ServiceLine[]
    user: AdminAppointmentUser
    retailSales?: AdminRetailSale[]
}

export const STATUS_TONE: Record<AppointmentStatus, "primary" | "success" | "danger" | "muted"> = {
    PENDING: "primary",
    CONFIRMED: "success",
    CANCELLED: "danger",
    COMPLETED: "muted",
    NO_SHOW: "danger",
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
    PENDING: "PENDING",
    CONFIRMED: "CONFIRMED",
    CANCELLED: "CANCELLED",
    COMPLETED: "COMPLETED",
    NO_SHOW: "NO-SHOW",
}

export const ARTIST_COLOR_CYCLE: { header: string }[] = [
    { header: "bg-primary/10 text-primary" },
    { header: "bg-accent/20 text-accent-foreground" },
    { header: "bg-success/10 text-success" },
    { header: "bg-muted text-muted-foreground" },
]

export const CATEGORY_BLOCK_COLOR: Record<CategoryColor, { block: string; blockBorder: string }> = {
    gold: { block: "bg-schedule-tint-primary", blockBorder: "border-primary/40" },
    blue: { block: "bg-schedule-tint-accent", blockBorder: "border-accent/50" },
    green: { block: "bg-schedule-tint-success", blockBorder: "border-success/40" },
    rose: { block: "bg-schedule-tint-rose", blockBorder: "border-foreground/20" },
    lavender: { block: "bg-schedule-tint-lavender", blockBorder: "border-foreground/20" },
    peach: { block: "bg-schedule-tint-peach", blockBorder: "border-foreground/20" },
    teal: { block: "bg-schedule-tint-teal", blockBorder: "border-foreground/20" },
    lime: { block: "bg-schedule-tint-lime", blockBorder: "border-foreground/20" },
}

export type CategoryColors = Record<string, CategoryColor>

export function appointmentColor(
    appointment: AdminAppointment,
    colors: CategoryColors,
): CategoryColor {
    return colors[appointment.services[0].service.categoryId] ?? CATEGORY_COLORS[0]
}

export const STATUS_BAR_COLOR: Record<AppointmentStatus, string> = {
    PENDING: "bg-primary",
    CONFIRMED: "bg-success",
    CANCELLED: "bg-danger",
    COMPLETED: "bg-muted-foreground",
    NO_SHOW: "bg-danger",
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
    CASH: "Cash",
    CARD: "Card",
    GROUPON: "Groupon",
    OTHER: "Other",
}
