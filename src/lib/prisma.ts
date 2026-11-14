import { getCloudflareContext } from "@opennextjs/cloudflare"
import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers"

function createClient(connectionString: string | undefined, maxUses?: number) {
    const adapter = new PrismaPg({ connectionString, maxUses })
    return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function nodeClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createClient(process.env.DATABASE_URL)
    }
    return globalForPrisma.prisma
}

const perRequest = new WeakMap<object, PrismaClient>()

function workersClient(): PrismaClient {
    const { ctx } = getCloudflareContext()
    let client = perRequest.get(ctx)
    if (!client) {
        client = createClient(process.env.DATABASE_URL, 1)
        perRequest.set(ctx, client)
    }
    return client
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
    get(_target, property) {
        const client = onWorkers ? workersClient() : nodeClient()
        const value = Reflect.get(client, property, client)
        return typeof value === "function" ? value.bind(client) : value
    },
})
