import type { NextConfig } from "next"

const scriptSrc =
    process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'"

const servedOverHttps = process.env.AUTH_URL?.startsWith("https://") ?? false

const securityHeaders = [
    ...(servedOverHttps
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : []),
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            scriptSrc,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' https://res.cloudinary.com data:",
            "font-src 'self' data:",
            "connect-src 'self' https://api.cloudinary.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; "),
    },
]

const cloudName = process.env.CLOUDINARY_CLOUD_NAME

if (process.env.NODE_ENV === "production") {
    const missing = ["CLOUDINARY_CLOUD_NAME", "NEXT_PUBLIC_APP_URL"].filter(
        (name) => !process.env[name],
    )
    if (missing.length > 0) {
        throw new Error(
            `Production build: set ${missing.join(" and ")} in the build environment (see docs/DEPLOY_RUNBOOK.md).`,
        )
    }
}

const buildingForCloudflare = process.env.BUILD_TARGET === "cloudflare"

const nextConfig: NextConfig = {
    poweredByHeader: false,
    ...(buildingForCloudflare && {
        turbopack: {
            resolveAlias: {
                "@/generated/prisma/client": "./src/generated/prisma-workers/client.ts",
            },
        },
        outputFileTracingExcludes: {
            "**": [
                "node_modules/prisma/**",
                "node_modules/@prisma/dev/**",
                "node_modules/@prisma/engines/**",
                "node_modules/@electric-sql/**",
                "node_modules/blake3-wasm/**",
            ],
        },
    }),
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
                pathname: cloudName ? `/${cloudName}/**` : "/**",
            },
        ],
    },
    async headers() {
        return [
            { source: "/:path*", headers: securityHeaders },
            {
                source: "/sw.js",
                headers: [
                    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                    { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                ],
            },
        ]
    },
}

export default nextConfig
