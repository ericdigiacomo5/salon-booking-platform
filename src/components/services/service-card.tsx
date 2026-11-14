import type { Service } from "@/generated/prisma/client"
import { Card } from "@/components/ui/card"
import { DecoFrame } from "@/components/ui/deco"
import { formatDuration, formatPrice } from "@/lib/format"

export function ServiceCard({ service }: { service: Service }) {
    return (
        <Card className="relative flex flex-col p-7 transition duration-200 hover:shadow-raised motion-safe:hover:-translate-y-1">
            <span className="text-primary">
                <DecoFrame className="inset-2 rounded-lg" />
            </span>
            <span className="absolute -top-3.5 right-5 rounded-full bg-lacquer px-4 py-1 font-serif text-base font-bold italic text-lacquer-foreground shadow-sm">
                {formatPrice(service.priceCents)}
            </span>
            <h3 className="mt-1 font-serif text-2xl font-bold text-surface-foreground">
                {service.name}
            </h3>
            {service.description && (
                <p className="mt-2 text-base leading-relaxed text-body">{service.description}</p>
            )}
            <div className="mt-auto pt-4">
                <div className="text-sm text-muted-foreground">
                    {formatDuration(service.durationMinutes)}
                </div>
            </div>
        </Card>
    )
}
