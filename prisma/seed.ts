import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import { BCRYPT_COST } from "../src/lib/password"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const seedDevData = process.env.SEED_DEV_DATA === "1"

async function main() {
    if (seedDevData && process.env.NODE_ENV === "production") {
        throw new Error(
            "SEED_DEV_DATA=1 is for local development only — refusing with NODE_ENV=production.",
        )
    }

    await prisma.appSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            bookingEnabled: true,
        },
    })

    if (seedDevData) {
        const artist = await prisma.artist.upsert({
            where: { id: "seed-artist-ava" },
            update: {},
            create: {
                id: "seed-artist-ava",
                name: "Ava Reyes",
                bio: "Does nails and stuff.",
            },
        })

        const hands = await prisma.serviceCategory.upsert({
            where: { id: "category-hands" },
            update: {},
            create: { id: "category-hands", name: "Hands", position: 1, color: "gold" },
        })

        await prisma.service.upsert({
            where: { id: "seed-service-mani" },
            update: {},
            create: {
                id: "seed-service-mani",
                name: "Manicure",
                description: "Gel manicure with color.",
                categoryId: hands.id,
                durationMinutes: 45,
                priceCents: 4500,
            },
        })

        await prisma.availability.upsert({
            where: { id: "seed-avail-ava-tue" },
            update: {},
            create: {
                id: "seed-avail-ava-tue",
                artistId: artist.id,
                dayOfWeek: 2,
                startTime: "09:00",
                endTime: "17:00",
            },
        })
    }

    const hasSeedAdmin = Boolean(process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD)
    if (!hasSeedAdmin && !seedDevData) {
        console.log(
            "Seeded AppSettings. No admin created (set SEED_ADMIN_*, or use `npm run promote-admin`).",
        )
        return
    }
    if (!hasSeedAdmin) {
        console.warn(
            "SEED_DEV_DATA=1 without SEED_ADMIN_* — seeding the default dev admin login. Local development only.",
        )
    }

    const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase()
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin12345"

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: "Salon Admin",
            phone: "555-0100",
            passwordHash: await bcrypt.hash(adminPassword, BCRYPT_COST),
            role: "ADMIN",
            emailVerified: new Date(),
        },
    })

    console.log("Seeded:", { devData: seedDevData, admin: admin.email })
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
