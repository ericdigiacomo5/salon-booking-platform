import "dotenv/config"
import { createInterface } from "node:readline/promises"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
    const email = process.argv[2]?.trim().toLowerCase()

    if (!email) {
        console.error("Usage: npm run promote-admin -- <email>")
        process.exit(1)
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            _count: { select: { appointments: true } },
        },
    })

    if (!user) {
        console.error(
            `No account found for ${email}. They need to register first at /register, then run this again.`,
        )
        process.exit(1)
    }

    if (user.role === "ADMIN") {
        console.log(`${email} is already an admin.`)
        return
    }

    if (!user.emailVerified) {
        console.error(
            `${email} hasn't confirmed its email address. Have the owner click the link from the signup email ` +
                `(or use "Forgot password" from that inbox, which also confirms it), then run this again.`,
        )
        process.exit(1)
    }

    console.log("About to make this account an ADMIN:")
    console.log(`  Name:           ${user.name ?? "(none)"}`)
    console.log(`  Email:          ${user.email} (confirmed ${user.emailVerified.toISOString()})`)
    console.log(`  Phone:          ${user.phone}`)
    console.log(`  Created:        ${user.createdAt.toISOString()}`)
    console.log(`  Can sign in:    ${user.passwordHash ? "yes (password)" : "no (walk-in record)"}`)
    console.log(`  Appointments:   ${user._count.appointments}`)

    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const typed = (await rl.question("Type the email again to confirm: ")).trim().toLowerCase()
    rl.close()
    if (typed !== email) {
        console.error("Didn't match — nothing changed.")
        process.exit(1)
    }

    const updated = await prisma.user.update({
        where: { email },
        data: { role: "ADMIN", sessionsRevokedAt: new Date() },
    })

    console.log(
        `${updated.email} is now an admin. Existing sessions were signed out — sign in again.`,
    )
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
