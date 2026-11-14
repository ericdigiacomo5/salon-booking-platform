import type { Metadata } from "next"
import { AdminUsersManager } from "@/components/admin/users/admin-users-manager"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Customers" }

export default async function AdminUsersPage() {
    await requireAdminPage("/admin/users")

    return <AdminUsersManager />
}
