import { test } from "node:test"
import assert from "node:assert/strict"
import {
    isNoShowFlagged,
    noShowLabel,
    summarizeCustomer,
    type SummaryAppointment,
} from "@/lib/customer-summary"

const NOW = new Date("2026-10-19T12:00:00")

function visit(
    startTime: string,
    status: SummaryAppointment["status"],
    artist: string,
    services: [name: string, priceCents: number][],
    discount: Pick<SummaryAppointment, "discountType" | "discountValue"> = {
        discountType: null,
        discountValue: null,
    },
): SummaryAppointment {
    return {
        startTime,
        status,
        ...discount,
        artist: { name: artist },
        services: services.map(([name, priceCents]) => ({ priceCents, service: { name } })),
    }
}

test("a customer with no history has empty figures, not zeros pretending to be rates", () => {
    const summary = summarizeCustomer([], NOW)
    assert.equal(summary.visits, 0)
    assert.equal(summary.spentCents, 0)
    assert.equal(summary.averageCents, null)
    assert.equal(summary.lastVisit, null)
    assert.equal(summary.nextVisit, null)
    assert.equal(summary.usualArtist, null)
    assert.deepEqual(summary.topServices, [])
    assert.equal(summary.noShowRate, null)
})

test("spend counts completed visits only, after discounts", () => {
    const summary = summarizeCustomer(
        [
            visit(
                "2026-09-01T10:00:00",
                "COMPLETED",
                "Ava",
                [
                    ["Gel", 4000],
                    ["Polish", 2500],
                ],
                {
                    discountType: "PERCENT",
                    discountValue: 10,
                },
            ),
            visit("2026-09-15T10:00:00", "COMPLETED", "Ava", [["Gel", 4000]], {
                discountType: "AMOUNT",
                discountValue: 500,
            }),
            visit("2026-09-20T10:00:00", "CANCELLED", "Ava", [["Gel", 4000]]),
            visit("2026-09-25T10:00:00", "NO_SHOW", "Ava", [["Gel", 4000]]),
        ],
        NOW,
    )
    assert.equal(summary.visits, 2)
    assert.equal(summary.spentCents, 5850 + 3500)
    assert.equal(summary.averageCents, 4675)
    assert.equal(summary.cancellations, 1)
    assert.equal(summary.noShows, 1)
    assert.equal(summary.noShowRate, 1 / 3)
})

test("last and next visit come from completed and still-open bookings", () => {
    const summary = summarizeCustomer(
        [
            visit("2026-09-01T10:00:00", "COMPLETED", "Ava", [["Gel", 4000]]),
            visit("2026-10-05T10:00:00", "COMPLETED", "Ava", [["Gel", 4000]]),
            visit("2026-11-02T10:00:00", "CONFIRMED", "Ava", [["Gel", 4000]]),
            visit("2026-10-26T10:00:00", "PENDING", "Ava", [["Gel", 4000]]),
            visit("2026-10-20T10:00:00", "CANCELLED", "Ava", [["Gel", 4000]]),
            visit("2026-10-19T09:00:00", "CONFIRMED", "Ava", [["Gel", 4000]]),
        ],
        NOW,
    )
    assert.deepEqual(summary.lastVisit, new Date("2026-10-05T10:00:00"))
    assert.deepEqual(summary.nextVisit, new Date("2026-10-26T10:00:00"))
})

test("usual artist and top services rank by count, ties going to the most recent", () => {
    const summary = summarizeCustomer(
        [
            visit("2026-08-01T10:00:00", "COMPLETED", "Mia", [["Pedicure", 3500]]),
            visit("2026-08-15T10:00:00", "COMPLETED", "Ava", [
                ["Gel", 4000],
                ["Pedicure", 3500],
            ]),
            visit("2026-09-01T10:00:00", "COMPLETED", "Mia", [["Wax", 1500]]),
            visit("2026-09-15T10:00:00", "COMPLETED", "Ava", [
                ["Gel", 4000],
                ["Art", 1000],
            ]),
            visit("2026-10-01T10:00:00", "NO_SHOW", "Cara", [["Gel", 4000]]),
        ],
        NOW,
    )
    assert.equal(summary.usualArtist, "Ava")
    assert.deepEqual(summary.topServices, ["Gel", "Pedicure", "Art"])
})

test("the no-show flag starts at two", () => {
    assert.equal(isNoShowFlagged(1), false)
    assert.equal(isNoShowFlagged(2), true)
    assert.equal(noShowLabel(1), "1 no-show")
    assert.equal(noShowLabel(3), "3 no-shows")
})
