"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBag } from "lucide-react"
import type { DiscountType, PaymentMethod, RetailSaleStatus } from "@/generated/prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { useToast } from "@/components/ui/toast"
import { PAYMENT_METHOD_LABEL } from "@/components/admin/appointment-shared"
import { UserStep } from "@/components/admin/booking/user-step"
import type { SelectedUser } from "@/components/admin/booking/booking-types"
import { describeDiscount, discountError, type Discount } from "@/lib/discount"
import { formatPrice } from "@/lib/format"
import { CREDIT_NOTE_MAX } from "@/lib/credit-shared"
import { formatTaxRate, retailTotals, savedSaleTotals } from "@/lib/retail"
import { formatSalonDateTime } from "@/lib/salon-time"
import {
    pickedLines,
    ProductPicker,
    type PickedProduct,
    type ProductOption,
} from "./product-picker"

const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "GROUPON", "OTHER"]

export type RetailSaleListItem = {
    id: string
    status: RetailSaleStatus
    soldAt: Date | string
    appointmentId: string | null
    discountType: DiscountType | null
    discountValue: number | null
    taxRateMillipercent: number
    taxCents: number
    paymentMethod: PaymentMethod | null
    creditAppliedCents: number
    voidReason: string | null
    voidedAt: Date | string | null
    items: {
        productId: string
        quantity: number
        unitPriceCents: number
        product: { name: string }
    }[]
    artist: { id: string; name: string } | null
    user: { id: string; name: string | null; email: string } | null
    createdBy: { name: string | null; email: string }
    voidedBy: { name: string | null; email: string } | null
}

const FIELD =
    "mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground"
const LABEL = "block text-xs font-medium text-muted-foreground"

export function RetailSaleManager({
    products,
    artists,
    taxRateMillipercent,
    initialSales,
}: {
    products: ProductOption[]
    artists: { id: string; name: string }[]
    taxRateMillipercent: number
    initialSales: RetailSaleListItem[]
}) {
    const [sales, setSales] = useState(initialSales)
    const toast = useToast()

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h2 className="text-lg font-semibold text-foreground">Retail Sale</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    {`Products bought without a visit's checkout. Products bought at a visit are added at its checkout on the schedule. Sales tax: ${formatTaxRate(taxRateMillipercent)}. Totals are on the `}
                    <Link href="/admin/reports/retail" className="underline">
                        Retail &amp; Tax Report
                    </Link>
                    .
                </p>
            </div>

            <NewSaleForm
                products={products}
                artists={artists}
                taxRateMillipercent={taxRateMillipercent}
                onSaved={(sale) => {
                    setSales((prev) => [sale, ...prev])
                    toast(`Sale recorded — ${formatPrice(savedSaleTotals(sale).totalCents)}.`)
                }}
            />

            <section aria-labelledby="recent-sales">
                <h3 id="recent-sales" className="text-base font-semibold text-foreground">
                    Recent sales
                </h3>
                {sales.length === 0 ? (
                    <EmptyState icon={ShoppingBag} title="No retail sales yet" className="mt-4">
                        Sales from this page and from checkouts appear here.
                    </EmptyState>
                ) : (
                    <ul className="mt-3 flex flex-col gap-3">
                        {sales.map((sale) => (
                            <SaleRow
                                key={sale.id}
                                sale={sale}
                                onVoided={(updated) => {
                                    setSales((prev) =>
                                        prev.map((s) => (s.id === updated.id ? updated : s)),
                                    )
                                    toast("Sale voided.")
                                }}
                            />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

function NewSaleForm({
    products,
    artists,
    taxRateMillipercent,
    onSaved,
}: {
    products: ProductOption[]
    artists: { id: string; name: string }[]
    taxRateMillipercent: number
    onSaved: (sale: RetailSaleListItem) => void
}) {
    const [picked, setPicked] = useState<PickedProduct[]>([])
    const [customer, setCustomer] = useState<SelectedUser | null>(null)
    const [choosingCustomer, setChoosingCustomer] = useState(false)
    const [balanceCents, setBalanceCents] = useState<number | null>(null)
    const [sellerId, setSellerId] = useState("")
    const [discountType, setDiscountType] = useState<"" | DiscountType>("")
    const [discountInput, setDiscountInput] = useState("")
    const [creditInput, setCreditInput] = useState("")
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARD")
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!customer) return
        let cancelled = false
        fetch(`/api/admin/users/${customer.id}/credit`)
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (!cancelled) setBalanceCents(body?.data?.balanceCents ?? 0)
            })
            .catch(() => {
                if (!cancelled) setBalanceCents(0)
            })
        return () => {
            cancelled = true
        }
    }, [customer])

    const lines = pickedLines(products, picked)
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0)
    const discountValue =
        discountType === "AMOUNT"
            ? Math.round(Number(discountInput) * 100)
            : Math.round(Number(discountInput))
    const discount: Discount | null =
        discountType === "" ? null : { type: discountType, value: discountValue }
    const discountProblem =
        discount && discountInput.trim() !== ""
            ? discountError(discount, subtotal)?.replace("the service price", "the products' price")
            : discount
              ? "Enter the discount"
              : null
    const totals = retailTotals(lines, discountProblem ? null : discount, taxRateMillipercent)

    const creditCents =
        customer && creditInput.trim() !== "" ? Math.round(Number(creditInput) * 100) : 0
    const maxCredit = Math.min(balanceCents ?? 0, totals.totalCents)
    const creditProblem =
        Number.isNaN(creditCents) || creditCents < 0
            ? "Enter an amount"
            : creditCents > maxCredit
              ? `At most ${formatPrice(maxCredit)}`
              : null
    const dueCents = totals.totalCents - (creditProblem ? 0 : creditCents)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (picked.length === 0 || discountProblem || creditProblem) return
        setError(null)
        setPending(true)
        try {
            const res = await fetch("/api/admin/retail-sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: picked,
                    userId: customer?.id ?? null,
                    artistId: sellerId || null,
                    discount,
                    ...(creditCents > 0 && { creditCents }),
                    paymentMethod: dueCents > 0 ? paymentMethod : null,
                }),
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) {
                setError(body?.error ?? "Couldn't record the sale. Please try again.")
                return
            }
            onSaved(body.data)
            setPicked([])
            setCustomer(null)
            setBalanceCents(null)
            setDiscountType("")
            setDiscountInput("")
            setCreditInput("")
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setPending(false)
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-4 shadow-sm"
        >
            <fieldset className="flex flex-col gap-2">
                <legend className="text-sm font-medium text-surface-foreground">Products</legend>
                <ProductPicker
                    products={products}
                    value={picked}
                    onChange={setPicked}
                    disabled={pending}
                    idPrefix="retail"
                />
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="retail-seller" className={LABEL}>
                        Sold by (for retail commission)
                    </label>
                    <select
                        id="retail-seller"
                        value={sellerId}
                        onChange={(e) => setSellerId(e.target.value)}
                        disabled={pending}
                        className={FIELD}
                    >
                        <option value="">House (no artist)</option>
                        {artists.map((artist) => (
                            <option key={artist.id} value={artist.id}>
                                {artist.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <span className={LABEL}>Discount (optional)</span>
                    <div className="mt-1 flex gap-2">
                        <label htmlFor="retail-discount-type" className="sr-only">
                            Discount type
                        </label>
                        <select
                            id="retail-discount-type"
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as "" | DiscountType)}
                            disabled={pending}
                            className="h-11 rounded-sm border border-border bg-background px-2 text-sm text-foreground"
                        >
                            <option value="">None</option>
                            <option value="PERCENT">% off</option>
                            <option value="AMOUNT">$ off</option>
                        </select>
                        {discountType !== "" && (
                            <>
                                <label htmlFor="retail-discount-value" className="sr-only">
                                    {discountType === "PERCENT" ? "Percent off" : "Dollars off"}
                                </label>
                                <input
                                    id="retail-discount-value"
                                    type="number"
                                    inputMode="decimal"
                                    min={discountType === "PERCENT" ? 1 : 0.01}
                                    max={discountType === "PERCENT" ? 100 : undefined}
                                    step={discountType === "PERCENT" ? 1 : 0.01}
                                    value={discountInput}
                                    onChange={(e) => setDiscountInput(e.target.value)}
                                    disabled={pending}
                                    className="h-11 w-28 rounded-sm border border-border bg-background px-3 text-sm text-foreground"
                                />
                            </>
                        )}
                    </div>
                    {discountProblem && picked.length > 0 && (
                        <p className="mt-1 text-xs text-danger">{discountProblem}</p>
                    )}
                </div>
            </div>

            <div>
                <span className={LABEL}>Customer (optional — needed to use store credit)</span>
                {customer ? (
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium text-foreground">
                            {customer.name ?? customer.email}
                        </span>
                        {balanceCents !== null && (
                            <span className="text-muted-foreground">
                                {`Store credit ${formatPrice(balanceCents)}`}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setCustomer(null)
                                setBalanceCents(null)
                                setCreditInput("")
                            }}
                            disabled={pending}
                            className="min-h-11 cursor-pointer font-medium text-primary-strong"
                        >
                            Remove
                        </button>
                    </div>
                ) : choosingCustomer ? (
                    <div className="mt-2 rounded-sm border border-border p-3">
                        <UserStep
                            onSelect={(user) => {
                                setCustomer(user)
                                setChoosingCustomer(false)
                            }}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            onClick={() => setChoosingCustomer(false)}
                            className="mt-2"
                        >
                            No Customer
                        </Button>
                    </div>
                ) : (
                    <div className="mt-1">
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            onClick={() => setChoosingCustomer(true)}
                            disabled={pending}
                        >
                            Choose Customer
                        </Button>
                    </div>
                )}
            </div>

            {picked.length > 0 && (
                <dl className="flex flex-col gap-1 rounded-sm bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between">
                        <dt>Products</dt>
                        <dd className="tabular-nums">{formatPrice(totals.subtotalCents)}</dd>
                    </div>
                    {totals.discountCents > 0 && discount && (
                        <div className="flex justify-between">
                            <dt>{`Discount (${describeDiscount(discount)})`}</dt>
                            <dd className="tabular-nums">{`−${formatPrice(totals.discountCents)}`}</dd>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <dt>{`Sales tax (${formatTaxRate(taxRateMillipercent)})`}</dt>
                        <dd className="tabular-nums">{formatPrice(totals.taxCents)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-1 font-semibold">
                        <dt>Total</dt>
                        <dd className="tabular-nums">{formatPrice(totals.totalCents)}</dd>
                    </div>
                </dl>
            )}

            {customer && balanceCents !== null && balanceCents > 0 && picked.length > 0 && (
                <div>
                    <label htmlFor="retail-credit" className={LABEL}>
                        {`Store credit to use (up to ${formatPrice(maxCredit)})`}
                    </label>
                    <input
                        id="retail-credit"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={maxCredit / 100}
                        step={0.01}
                        placeholder="0.00"
                        value={creditInput}
                        onChange={(e) => setCreditInput(e.target.value)}
                        disabled={pending}
                        className={`${FIELD} sm:w-40`}
                    />
                    {creditProblem && <p className="mt-1 text-xs text-danger">{creditProblem}</p>}
                </div>
            )}

            {picked.length > 0 && dueCents > 0 && (
                <div>
                    <label htmlFor="retail-payment" className={LABEL}>
                        {`How was ${creditCents > 0 ? "the rest" : "it"} paid? (${formatPrice(dueCents)})`}
                    </label>
                    <select
                        id="retail-payment"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        disabled={pending}
                        className={`${FIELD} sm:w-56`}
                    >
                        {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>
                                {PAYMENT_METHOD_LABEL[method]}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {error && (
                <p role="alert" className="text-sm text-danger">
                    {error}
                </p>
            )}

            <div>
                <Button
                    type="submit"
                    disabled={
                        pending ||
                        picked.length === 0 ||
                        discountProblem !== null ||
                        creditProblem !== null
                    }
                >
                    {pending ? "Recording..." : "Record Sale"}
                </Button>
            </div>
        </form>
    )
}

function SaleRow({
    sale,
    onVoided,
}: {
    sale: RetailSaleListItem
    onVoided: (sale: RetailSaleListItem) => void
}) {
    const [voiding, setVoiding] = useState(false)
    const [reason, setReason] = useState("")
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const totals = savedSaleTotals(sale)
    const voided = sale.status === "VOIDED"

    async function handleVoid() {
        setError(null)
        setPending(true)
        try {
            const res = await fetch(`/api/admin/retail-sales/${sale.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "VOIDED", reason }),
            })
            const body = await res.json().catch(() => null)
            if (!res.ok) {
                setError(body?.error ?? "Couldn't void the sale. Please try again.")
                return
            }
            onVoided(body.data)
            setVoiding(false)
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setPending(false)
        }
    }

    const paid = [
        sale.paymentMethod && PAYMENT_METHOD_LABEL[sale.paymentMethod],
        sale.creditAppliedCents > 0 && `${formatPrice(sale.creditAppliedCents)} store credit`,
    ]
        .filter(Boolean)
        .join(" + ")

    return (
        <li className="rounded-lg border border-line bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className={voided ? "text-muted-foreground" : undefined}>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                            {sale.items
                                .map((item) =>
                                    item.quantity > 1
                                        ? `${item.product.name} ×${item.quantity}`
                                        : item.product.name,
                                )
                                .join(", ")}
                        </span>
                        {voided && <Badge tone="danger">Voided</Badge>}
                        {sale.appointmentId && <Badge tone="muted">At checkout</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {`${formatSalonDateTime(sale.soldAt, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} · sold by ${sale.artist?.name ?? "the house"}${sale.user ? ` · ${sale.user.name ?? sale.user.email}` : ""}`}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {`${formatPrice(totals.netCents)} + ${formatPrice(totals.taxCents)} tax (${formatTaxRate(sale.taxRateMillipercent)}) = ${formatPrice(totals.totalCents)}${paid ? ` · ${paid}` : ""}`}
                    </p>
                    {voided && sale.voidReason && (
                        <p className="mt-1 text-sm">
                            {`Voided${sale.voidedBy ? ` by ${sale.voidedBy.name ?? sale.voidedBy.email}` : ""}: ${sale.voidReason}`}
                        </p>
                    )}
                </div>
                {!voided && !voiding && (
                    <Button
                        type="button"
                        variant="quiet"
                        size="md"
                        onClick={() => setVoiding(true)}
                    >
                        Void
                    </Button>
                )}
            </div>

            {voiding && (
                <div className="mt-3 flex flex-col gap-2 rounded-sm bg-danger/5 p-3">
                    <label htmlFor={`void-reason-${sale.id}`} className={LABEL}>
                        {`Why is this sale being voided?${sale.creditAppliedCents > 0 ? " The store credit goes back on the customer's account." : ""}`}
                    </label>
                    <input
                        id={`void-reason-${sale.id}`}
                        value={reason}
                        maxLength={CREDIT_NOTE_MAX}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={pending}
                        className={FIELD}
                    />
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="danger"
                            size="md"
                            disabled={pending || reason.trim() === ""}
                            onClick={handleVoid}
                        >
                            {pending ? "Voiding..." : "Yes, Void Sale"}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            disabled={pending}
                            onClick={() => setVoiding(false)}
                        >
                            Keep
                        </Button>
                    </div>
                </div>
            )}
            {error && (
                <p role="alert" className="mt-2 text-sm text-danger">
                    {error}
                </p>
            )}
        </li>
    )
}
