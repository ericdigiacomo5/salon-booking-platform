"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ADMIN_GROUPS: { label: string; links: { href: string; label: string }[] }[] = [
    { label: "Schedule", links: [{ href: "/admin", label: "Bookings" }] },
    {
        label: "Catalog",
        links: [
            { href: "/admin/services", label: "Services" },
            { href: "/admin/products", label: "Products" },
            { href: "/admin/artists", label: "Artists" },
            { href: "/admin/availability", label: "Availability" },
            { href: "/admin/time-off", label: "Time Off" },
        ],
    },
    {
        label: "People",
        links: [
            { href: "/admin/users", label: "Customers" },
            { href: "/admin/recurring", label: "Standing Appointments" },
        ],
    },
    {
        label: "Money",
        links: [
            { href: "/admin/retail", label: "Retail Sale" },
            { href: "/admin/gift-cards", label: "Gift Cards" },
            { href: "/admin/reports/pay", label: "Pay Report" },
            { href: "/admin/reports/retail", label: "Retail & Tax Report" },
        ],
    },
    { label: "Settings", links: [{ href: "/admin/settings", label: "Settings" }] },
]

export function AdminNav() {
    const pathname = usePathname()
    const isActive = (href: string) =>
        pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))

    return (
        <nav
            aria-label="Admin"
            className="mt-4 flex gap-5 overflow-x-auto border-b border-border lg:flex-col lg:gap-4 lg:overflow-visible lg:border-b-0 print:hidden"
        >
            {ADMIN_GROUPS.map((group) => (
                <div
                    key={group.label}
                    className="flex shrink-0 items-end gap-3 lg:flex-col lg:items-stretch lg:gap-0"
                >
                    {!(group.links.length === 1 && group.links[0].label === group.label) && (
                        <p className="shrink-0 pb-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:pb-1 lg:pl-4">
                            {group.label}
                        </p>
                    )}
                    <ul
                        className="flex gap-4 lg:flex-col lg:gap-0 lg:border-l lg:border-border"
                        aria-label={group.label}
                    >
                        {group.links.map((link) => {
                            const active = isActive(link.href)
                            return (
                                <li key={link.href} className="shrink-0">
                                    <Link
                                        href={link.href}
                                        aria-current={active ? "page" : undefined}
                                        className={
                                            "flex min-h-11 items-center border-b-2 px-1 text-sm font-medium lg:-ml-px lg:border-b-0 lg:border-l-2 lg:px-4 " +
                                            (active
                                                ? "border-primary text-primary-strong lg:bg-surface"
                                                : "border-transparent text-muted-foreground hover:text-foreground lg:hover:bg-surface")
                                        }
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    )
}
