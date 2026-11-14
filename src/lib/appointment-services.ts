import { MAX_APPOINTMENT_MINUTES } from "@/lib/schedule-grid"

export const MAX_SERVICES_PER_APPOINTMENT = 8

export type ServiceLine = {
    serviceId: string
    priceCents: number
    durationMinutes: number
    service: { id: string; name: string; categoryId: string }
}

export const SERVICE_LINES_INCLUDE = {
    services: { include: { service: true }, orderBy: { position: "asc" as const } },
}

export function servicesLabel(lines: { service: { name: string } }[]): string {
    return lines.map((line) => line.service.name).join(" + ")
}

export function servicesPriceCents(lines: { priceCents: number }[]): number {
    return lines.reduce((sum, line) => sum + line.priceCents, 0)
}

export function servicesDurationMinutes(lines: { durationMinutes: number }[]): number {
    return lines.reduce((sum, line) => sum + line.durationMinutes, 0)
}

export function parseServiceIds(value: unknown): string[] | string {
    if (!Array.isArray(value) || value.length === 0) {
        return "At least one service is required"
    }
    if (value.length > MAX_SERVICES_PER_APPOINTMENT) {
        return `An appointment can have at most ${MAX_SERVICES_PER_APPOINTMENT} services`
    }
    if (!value.every((id): id is string => typeof id === "string" && id.length > 0)) {
        return "serviceIds must be a list of service ids"
    }
    if (new Set(value).size !== value.length) {
        return "Each service can only be added once"
    }
    return value
}

export function servicesFitOneAppointment(lines: { durationMinutes: number }[]): boolean {
    return servicesDurationMinutes(lines) <= MAX_APPOINTMENT_MINUTES
}
