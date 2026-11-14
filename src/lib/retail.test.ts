import { test } from "node:test"
import assert from "node:assert/strict"
import {
    formatTaxRate,
    parseRetailItems,
    percentToMillipercent,
    retailTotals,
    salesTaxCents,
    savedSaleTotals,
    MAX_RETAIL_LINES,
} from "@/lib/retail"
import {
    retailSaleFigures,
    retailSummary,
    salesByProduct,
    taxByRate,
    type RetailReportSale,
} from "@/lib/retail-report"
import { paySummary, visitFigures } from "@/lib/pay-report"

const POLISH = { productId: "polish", productName: "Polish", quantity: 2, unitPriceCents: 1200 }
const OIL = { productId: "oil", productName: "Cuticle Oil", quantity: 1, unitPriceCents: 850 }

test("retailTotals: subtotal, then discount, then tax on what's left", () => {
    assert.deepEqual(retailTotals([POLISH, OIL], { type: "PERCENT", value: 10 }, 8625), {
        subtotalCents: 3250,
        discountCents: 325,
        netCents: 2925,
        taxCents: 252,
        totalCents: 3177,
    })
    assert.deepEqual(
        retailTotals([{ quantity: 1, unitPriceCents: 1000 }], { type: "AMOUNT", value: 500 }, 8625),
        { subtotalCents: 1000, discountCents: 500, netCents: 500, taxCents: 43, totalCents: 543 },
    )
})

test("sales tax rounds half up, once per sale, and a 0% rate charges nothing", () => {
    assert.equal(salesTaxCents(2000, 8625), 173)
    assert.equal(salesTaxCents(1999, 8625), 172)
    assert.equal(salesTaxCents(5000, 0), 0)
    assert.equal(retailTotals([POLISH], null, 0).totalCents, 2400)
})

test("savedSaleTotals uses the tax actually charged, not a recomputed one", () => {
    const totals = savedSaleTotals({
        items: [POLISH],
        discountType: null,
        discountValue: null,
        taxCents: 199,
    })
    assert.equal(totals.netCents, 2400)
    assert.equal(totals.taxCents, 199)
    assert.equal(totals.totalCents, 2599)
})

test("parseRetailItems accepts a clean list and refuses bad ones", () => {
    assert.deepEqual(parseRetailItems([{ productId: "a", quantity: 2 }]), [
        { productId: "a", quantity: 2 },
    ])
    assert.deepEqual(parseRetailItems([]), [])
    for (const bad of [
        "nope",
        [{ productId: "a", quantity: 0 }],
        [{ productId: "a", quantity: 1.5 }],
        [{ productId: "a", quantity: 100 }],
        [{ productId: "", quantity: 1 }],
        [
            { productId: "a", quantity: 1 },
            { productId: "a", quantity: 2 },
        ],
        Array.from({ length: MAX_RETAIL_LINES + 1 }, (_, i) => ({
            productId: `p${i}`,
            quantity: 1,
        })),
    ]) {
        assert.equal(typeof parseRetailItems(bad), "string", JSON.stringify(bad).slice(0, 60))
    }
})

test("tax rates: typed percent ↔ thousandths of a percent", () => {
    assert.equal(percentToMillipercent("8.625"), 8625)
    assert.equal(percentToMillipercent(" 8 "), 8000)
    assert.equal(percentToMillipercent("25"), 25000)
    assert.equal(percentToMillipercent("0"), 0)
    for (const bad of ["8.6255", "26", "-1", "abc", "", "86.25"]) {
        assert.equal(percentToMillipercent(bad), null, bad)
    }
    assert.equal(formatTaxRate(8625), "8.625%")
    assert.equal(formatTaxRate(8000), "8%")
    assert.equal(formatTaxRate(8500), "8.5%")
})

function sale(
    overrides: Partial<RetailReportSale> & Pick<RetailReportSale, "id">,
): RetailReportSale {
    return {
        soldAt: new Date(2026, 9, 14, 12),
        artistId: "ava",
        appointmentId: null,
        clientName: null,
        discount: null,
        taxRateMillipercent: 8625,
        taxCents: 0,
        paymentMethod: "CARD",
        creditAppliedCents: 0,
        commissionBasisPoints: 1000,
        commissionBackfilled: false,
        items: [POLISH],
        ...overrides,
    }
}

test("retail figures: commission on the after-discount, before-tax amount", () => {
    const figures = retailSaleFigures(
        sale({
            id: "s1",
            items: [POLISH, OIL],
            discount: { type: "PERCENT", value: 10 },
            taxCents: 252,
        }),
    )
    assert.equal(figures.netCents, 2925)
    assert.equal(figures.totalCents, 3177)
    assert.deepEqual(figures.lineNetCents, [2160, 765])
    assert.equal(figures.commissionCents, 293)
})

test("a house sale pays no commission; an artist with no rate makes it unknown", () => {
    const house = retailSaleFigures(sale({ id: "h", artistId: null, commissionBasisPoints: null }))
    assert.equal(house.commissionCents, 0)
    const unrated = retailSaleFigures(sale({ id: "u", commissionBasisPoints: null }))
    assert.equal(unrated.commissionCents, null)

    const summary = retailSummary([house, unrated])
    assert.equal(summary.salesWithoutRate, 1)
    assert.equal(summary.commissionCents, null)
    assert.equal(retailSummary([house]).commissionCents, 0)
})

test("retail summary, sales by product and tax by rate add up", () => {
    const rows = [
        sale({ id: "a", items: [POLISH], taxCents: 207 }),
        sale({ id: "b", items: [OIL, { ...POLISH, quantity: 1 }], taxCents: 177 }),
        sale({ id: "c", items: [OIL], taxRateMillipercent: 8000, taxCents: 68 }),
    ].map(retailSaleFigures)

    const summary = retailSummary(rows)
    assert.equal(summary.saleCount, 3)
    assert.equal(summary.unitCount, 5)
    assert.equal(summary.netCents, 2400 + 2050 + 850)
    assert.equal(summary.taxCents, 207 + 177 + 68)
    assert.equal(summary.totalCents, summary.netCents + summary.taxCents)
    assert.equal(summary.commissionCents, 240 + 205 + 85)

    const products = salesByProduct(rows)
    assert.deepEqual(
        products.map((row) => [row.productId, row.unitCount, row.netCents]),
        [
            ["polish", 3, 3600],
            ["oil", 2, 1700],
        ],
    )
    assert.equal(
        products.reduce((sum, row) => sum + row.netCents, 0),
        summary.netCents,
    )

    assert.deepEqual(taxByRate(rows), [
        { taxRateMillipercent: 8000, saleCount: 1, netCents: 850, taxCents: 68 },
        { taxRateMillipercent: 8625, saleCount: 2, netCents: 4450, taxCents: 384 },
    ])
})

test("paySummary adds retail commission to take-home; the salon keeps the rest of both", () => {
    const visits = [
        visitFigures({
            id: "v",
            artistId: "ava",
            startTime: new Date(2026, 9, 14, 10),
            createdAt: new Date(2026, 9, 14, 9),
            clientName: null,
            discount: null,
            paymentMethod: "CARD",
            creditAppliedCents: 0,
            commissionBasisPoints: 4500,
            commissionBackfilled: false,
            lines: [
                {
                    serviceId: "mani",
                    serviceName: "Manicure",
                    category: { id: "cat-hands", name: "Hands", position: 1 },
                    priceCents: 5000,
                    serviceFeeCents: 0,
                },
            ],
        }),
    ]
    const retail = [retailSaleFigures(sale({ id: "r", items: [POLISH], taxCents: 207 }))]

    const summary = paySummary(visits, retail)
    assert.equal(summary.retailSalesCents, 2400)
    assert.equal(summary.retailCommissionCents, 240)
    assert.equal(summary.takeHomeCents, 2250 + 240)
    assert.equal(summary.salonKeepsCents, 5000 + 2400 - (2250 + 240))

    assert.equal(paySummary(visits).takeHomeCents, 2250)
    assert.equal(paySummary(visits).retailSaleCount, 0)

    const unknown = paySummary(visits, [
        retailSaleFigures(sale({ id: "x", commissionBasisPoints: null })),
    ])
    assert.equal(unknown.takeHomeCents, null)
})
