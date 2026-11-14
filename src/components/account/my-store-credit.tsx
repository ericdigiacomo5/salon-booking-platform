import { formatPrice } from "@/lib/format"
import type { CreditEntryRow } from "@/lib/credit-shared"
import { CreditHistory } from "@/components/credit/credit-history"

export function MyStoreCredit({
    balanceCents,
    entries,
}: {
    balanceCents: number
    entries: CreditEntryRow[]
}) {
    return (
        <section className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-foreground">
                Gift Cards &amp; Store Credit
            </h2>
            <div className="mt-4 rounded-xl border border-line bg-surface p-4 shadow-card">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Your balance
                </p>
                <p className="mt-0.5 text-2xl font-semibold text-surface-foreground">
                    {formatPrice(balanceCents)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Applied at checkout when you visit. Store credit never expires. Have a gift
                    card? Bring it to the salon and we&apos;ll add it to your account.
                </p>
            </div>

            <h3 className="mt-6 text-base font-semibold text-foreground">History</h3>
            <CreditHistory entries={entries} />
        </section>
    )
}
