"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import { Menu, X } from "lucide-react"
import { SITE_NAME } from "@/lib/site"
import { CallToBook } from "@/components/ui/call-to-book"

const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/artists", label: "Artists" },
    { href: "/about", label: "About" },
]

export function Header() {
    const pathname = usePathname()
    const { data: session, status } = useSession()
    const isAdmin = session?.user?.role === "ADMIN"
    const [isOpen, setIsOpen] = useState(false)

    const closeMenu = () => setIsOpen(false)

    const signedIn = status === "authenticated"
    const inlineNavClass = signedIn
        ? "hidden shrink-0 items-center gap-5 xl:flex"
        : "hidden shrink-0 items-center gap-6 lg:flex"
    const menuOnlyClass = signedIn ? "xl:hidden" : "lg:hidden"

    const navLinkClass = (active: boolean) =>
        active
            ? "whitespace-nowrap font-jost text-sm font-semibold uppercase tracking-wide text-accent"
            : "whitespace-nowrap font-jost text-sm font-semibold uppercase tracking-wide text-black hover:text-primary-strong"

    const mobileNavLinkClass =
        "flex h-11 items-center font-jost text-base font-semibold uppercase tracking-wide text-foreground"

    return (
        <header className="sticky top-0 z-30 border-b border-line bg-background/95 shadow-card backdrop-blur print:hidden">
            <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 lg:gap-8">
                <Link href="/" onClick={closeMenu} className="flex min-w-0 items-center gap-3">
                    <Image
                        src="/logo.png"
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 flex-none rounded-full border-2 border-accent object-cover"
                    />
                    <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-serif text-[15px] font-extrabold tracking-normal text-foreground sm:text-lg sm:tracking-wide">
                            {SITE_NAME.toUpperCase()}
                        </span>
                        <span className="truncate font-script text-sm text-accent">
                            Anytown, N.Y.
                        </span>
                    </span>
                </Link>

                <nav className={inlineNavClass}>
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={navLinkClass(pathname === link.href)}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {status === "authenticated" && (
                        <Link
                            href="/appointments"
                            className={navLinkClass(pathname === "/appointments")}
                        >
                            My Bookings
                        </Link>
                    )}
                    {status === "authenticated" && (
                        <Link
                            href="/account"
                            prefetch={false}
                            className={navLinkClass(pathname === "/account")}
                        >
                            My Profile
                        </Link>
                    )}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            prefetch={false}
                            className={navLinkClass(
                                pathname === "/admin" || pathname.startsWith("/admin/"),
                            )}
                        >
                            Admin
                        </Link>
                    )}
                    {status === "authenticated" ? (
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="cursor-pointer whitespace-nowrap font-jost text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary-strong"
                        >
                            Sign Out
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            prefetch={false}
                            className="whitespace-nowrap font-jost text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary-strong"
                        >
                            Sign In
                        </Link>
                    )}
                    <CallToBook variant="primary" className="whitespace-nowrap text-white!" />
                </nav>

                <div className={`flex shrink-0 items-center gap-1 ${menuOnlyClass}`}>
                    <CallToBook
                        label="Call"
                        variant="primary"
                        showIcon={false}
                        className="px-3 text-white!"
                    />
                    <button
                        onClick={() => setIsOpen((open) => !open)}
                        className="flex h-11 w-11 cursor-pointer items-center justify-center"
                        aria-label={isOpen ? "Close menu" : "Open menu"}
                        aria-expanded={isOpen}
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {isOpen && (
                <nav
                    className={`flex flex-col gap-1 border-t-2 border-foreground px-4 py-3 ${menuOnlyClass}`}
                >
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={closeMenu}
                            className={mobileNavLinkClass}
                        >
                            {link.label}
                        </Link>
                    ))}
                    {status === "authenticated" && (
                        <Link
                            href="/appointments"
                            onClick={closeMenu}
                            className={mobileNavLinkClass}
                        >
                            My Bookings
                        </Link>
                    )}
                    {status === "authenticated" && (
                        <Link
                            href="/account"
                            prefetch={false}
                            onClick={closeMenu}
                            className={mobileNavLinkClass}
                        >
                            My Profile
                        </Link>
                    )}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            prefetch={false}
                            onClick={closeMenu}
                            className={mobileNavLinkClass}
                        >
                            Admin
                        </Link>
                    )}
                    {status === "authenticated" ? (
                        <button
                            onClick={() => {
                                closeMenu()
                                signOut({ callbackUrl: "/" })
                            }}
                            className={`${mobileNavLinkClass} cursor-pointer text-left`}
                        >
                            Sign Out
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            prefetch={false}
                            onClick={closeMenu}
                            className={mobileNavLinkClass}
                        >
                            Sign In
                        </Link>
                    )}
                    <CallToBook variant="primary" className="mt-2 w-full text-white!" />
                </nav>
            )}
        </header>
    )
}
