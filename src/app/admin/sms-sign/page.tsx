import type { Metadata } from "next"
import Link from "next/link"
import { PrintButton } from "@/components/admin/reports/print-button"
import { requireAdminPage } from "@/lib/require-admin-page"
import { SALON_CONTACT, SITE_NAME, formatPhone } from "@/lib/site"
import { SMS_JOIN_DETAILS, smsJoinHeadline } from "@/lib/sms-consent"

export const metadata: Metadata = { title: "Admin: Text Sign-Up Sign" }

export default async function SmsSignPage() {
    await requireAdminPage("/admin/sms-sign")

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
    const host = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")
    const number = SALON_CONTACT.smsNumber ? formatPhone(SALON_CONTACT.smsNumber) : null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 print:hidden">
                <Link
                    href="/admin/settings"
                    className="inline-block text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                    &larr; Back to Settings
                </Link>
                <h1 className="font-serif text-2xl text-foreground">Text Messages Sign</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                    {
                        "Print this and keep it at the front desk. Customers you book in can't tick the texting box online, so they turn texts on by texting JOIN from the phone number on their customer record. Only the customer can do this: staff can't turn texts on for anyone."
                    }
                </p>
            </div>

            {number ? (
                <>
                    <div className="print:hidden">
                        <PrintButton label="Print Sign" />
                    </div>
                    <section className="max-w-2xl rounded-lg border border-line bg-surface p-8 text-center shadow-sm print:max-w-none print:border-0 print:shadow-none">
                        <p className="font-serif text-xl text-surface-foreground">{SITE_NAME}</p>
                        <p className="mt-6 font-serif text-3xl leading-tight text-surface-foreground sm:text-4xl">
                            {smsJoinHeadline(number)}
                        </p>
                        <p className="mt-6 text-base text-surface-foreground">{SMS_JOIN_DETAILS}</p>
                        {host && (
                            <p className="mt-6 text-sm text-surface-foreground">
                                {`Terms: ${host}/terms#sms · Privacy: ${host}/privacy`}
                            </p>
                        )}
                    </section>
                </>
            ) : (
                <p className="max-w-2xl rounded-lg border border-line bg-surface p-4 text-sm text-surface-foreground shadow-sm">
                    {
                        "The sign appears here once the salon's texting number is set (SALON_CONTACT.smsNumber in src/lib/site.ts, after the texting registration is approved)."
                    }
                </p>
            )}
        </div>
    )
}
