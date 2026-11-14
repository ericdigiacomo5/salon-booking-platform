import type { Metadata, Viewport } from "next"
import { Bodoni_Moda, Yesteryear, Jost } from "next/font/google"
import "./globals.css"
import { auth } from "@/auth"
import { Providers } from "@/components/providers"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ProfileBanner } from "@/components/layout/profile-banner"
import { RegisterServiceWorker } from "@/components/pwa/service-worker-registration"
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site"

const bodoniModa = Bodoni_Moda({
    variable: "--font-bodoni-moda",
    subsets: ["latin"],
})

const yesteryear = Yesteryear({
    variable: "--font-yesteryear",
    weight: "400",
    subsets: ["latin"],
})

const jost = Jost({
    variable: "--font-jost",
    subsets: ["latin"],
})

export const metadata: Metadata = {
    title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
    description: SITE_TAGLINE,
    icons: { apple: "/icons/apple-touch-icon.png" },
    appleWebApp: { capable: true, title: "Demo Nail Salon", statusBarStyle: "default" },
}

export const viewport: Viewport = {
    themeColor: "#16212c",
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const session = await auth()

    return (
        <html
            lang="en"
            className={`${bodoniModa.variable} ${yesteryear.variable} ${jost.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-foreground focus:px-4 focus:py-3 focus:text-background"
                >
                    Skip to content
                </a>
                <Providers session={session}>
                    <Header />
                    <ProfileBanner />
                    <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
                        {children}
                    </main>
                    <Footer />
                </Providers>
                <RegisterServiceWorker />
            </body>
        </html>
    )
}
