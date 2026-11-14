import type { Metadata } from "next"
import { Sparkles } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { formatDuration, formatPrice } from "@/lib/format"
import { CATEGORY_ORDER } from "@/lib/service-category"
import { CallToBook } from "@/components/ui/call-to-book"
import { BOOKING_PHONE, formatPhone } from "@/lib/site"
import { EmptyState } from "@/components/ui/empty-state"
import { DecoDivider } from "@/components/ui/deco"

export const metadata: Metadata = { title: "Services & Pricing" }

export default async function ServicesPage() {
    const categories = await prisma.serviceCategory.findMany({
        include: { services: { where: { active: true }, orderBy: { createdAt: "asc" } } },
        orderBy: CATEGORY_ORDER,
    })
    const sections = categories.filter((category) => category.services.length > 0)

    return (
        <div className="flex flex-col">
            <section className="bg-accent px-4 py-16 text-center">
                <span className="font-script text-2xl text-muted">Our Menu of</span>
                <h1 className="mt-1 font-serif text-4xl font-extrabold text-background sm:text-6xl">
                    Services &amp; Pricing
                </h1>
                <DecoDivider align="center" className="mt-4 text-primary" />
                <p className="mt-5 text-background">
                    {`To book, call us at ${formatPhone(BOOKING_PHONE)} or stop by the salon.`}
                </p>
                <CallToBook className="mt-5" />
            </section>

            <div className="mx-auto w-full max-w-2xl px-4 py-14">
                {sections.length === 0 ? (
                    <EmptyState icon={Sparkles} title="Our menu is being updated">
                        Check back soon for services and prices.
                    </EmptyState>
                ) : (
                    <div className="flex flex-col gap-16">
                        {sections.map(({ id, name, services }) => (
                            <section key={id} aria-labelledby={`category-${id}`}>
                                <h2
                                    id={`category-${id}`}
                                    className="font-serif text-4xl font-extrabold text-foreground"
                                >
                                    {name}
                                </h2>
                                <DecoDivider className="mt-2 text-primary" />
                                <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface px-5 shadow-card sm:px-6">
                                    {services.map((service) => (
                                        <li
                                            key={service.id}
                                            className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-baseline justify-between gap-4 sm:block">
                                                    <h3 className="font-serif text-xl font-bold text-foreground">
                                                        {service.name}
                                                    </h3>
                                                    <span className="shrink-0 font-serif text-xl font-bold italic text-lacquer sm:hidden">
                                                        {formatPrice(service.priceCents)}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-sm text-muted-foreground">
                                                    {formatDuration(service.durationMinutes)}
                                                </p>
                                                {service.description && (
                                                    <p className="mt-2 text-base leading-relaxed text-body">
                                                        {service.description}
                                                    </p>
                                                )}
                                            </div>
                                            <span className="hidden shrink-0 font-serif text-2xl font-bold italic text-lacquer sm:block">
                                                {formatPrice(service.priceCents)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
