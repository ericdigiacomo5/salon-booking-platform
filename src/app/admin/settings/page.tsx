import type { Metadata } from "next"
import Link from "next/link"
import { PolicySettingsForm } from "@/components/admin/policy-settings"
import { RetailTaxSettingsForm } from "@/components/admin/retail-tax-settings"
import { getPolicySettings, getRetailTaxRate } from "@/lib/settings"
import { requireAdminPage } from "@/lib/require-admin-page"

export const metadata: Metadata = { title: "Admin: Settings" }

export default async function AdminSettingsPage() {
    await requireAdminPage("/admin/settings")

    const [policy, taxRate] = await Promise.all([getPolicySettings(), getRetailTaxRate()])

    return (
        <div className="flex flex-col gap-4">
            <PolicySettingsForm initial={policy} />
            <RetailTaxSettingsForm initialMillipercent={taxRate} />
            <section className="rounded-lg border border-line bg-surface p-4 shadow-sm">
                <h2 className="font-semibold text-surface-foreground">Text Messages</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {
                        "Customers you book in turn on appointment texts by texting JOIN to the salon's number. Print the sign for the front desk."
                    }
                </p>
                <Link
                    href="/admin/sms-sign"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold underline"
                >
                    Open the Desk Sign
                </Link>
            </section>
        </div>
    )
}
