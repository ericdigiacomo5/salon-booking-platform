import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { SAFE_USER_SELECT } from "@/lib/user-select"
import { AdminUserDetail } from "@/components/admin/users/admin-user-detail"
import { SERVICE_LINES_INCLUDE } from "@/lib/appointment-services"
import { ADMIN_CREDIT_ENTRY_SELECT } from "@/lib/credit-shared"
import { requireAdminPage } from "@/lib/require-admin-page"
import { smsStatusOf } from "@/lib/sms-consent"

export const metadata: Metadata = { title: "Admin: Customer" }

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    await requireAdminPage(`/admin/users/${id}`)

    const [row, appointments, creditEntries, pendingInvite] = await Promise.all([
        prisma.user.findUnique({
            where: { id },
            select: {
                ...SAFE_USER_SELECT,
                smsOptIn: true,
                smsPhone: true,
                smsConfirmedAt: true,
                passwordHash: true,
            },
        }),
        prisma.appointment.findMany({
            where: { userId: id },
            include: { artist: true, ...SERVICE_LINES_INCLUDE },
            orderBy: { startTime: "desc" },
        }),
        prisma.creditEntry.findMany({
            where: { userId: id },
            select: ADMIN_CREDIT_ENTRY_SELECT,
            orderBy: { createdAt: "desc" },
        }),
        prisma.passwordResetToken.findFirst({
            where: { userId: id, usedAt: null, expiresAt: { gt: new Date() } },
            select: { createdAt: true },
            orderBy: { createdAt: "desc" },
        }),
    ])

    if (!row) {
        notFound()
    }
    const { smsOptIn, smsPhone, smsConfirmedAt, passwordHash, ...user } = row

    return (
        <div>
            <Link
                href="/admin/users"
                className="inline-block text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
                &larr; Back to Users
            </Link>

            <AdminUserDetail
                user={user}
                appointments={appointments}
                creditEntries={creditEntries}
                smsStatus={smsStatusOf({ smsOptIn, smsPhone, smsConfirmedAt })}
                canSignIn={passwordHash !== null}
                invitedAt={pendingInvite?.createdAt ?? null}
            />
        </div>
    )
}
