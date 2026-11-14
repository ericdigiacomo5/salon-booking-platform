import { test } from "node:test"
import assert from "node:assert/strict"
import {
    categoryColorOf,
    cleanCategoryName,
    compareCategories,
    isCategoryColor,
    isCompleteOrder,
    moveCategory,
} from "@/lib/service-category"

test("moveCategory swaps with the neighbour, and refuses past either end", () => {
    const ids = ["a", "b", "c"]
    assert.deepEqual(moveCategory(ids, "b", "up"), ["b", "a", "c"])
    assert.deepEqual(moveCategory(ids, "b", "down"), ["a", "c", "b"])
    assert.equal(moveCategory(ids, "a", "up"), null)
    assert.equal(moveCategory(ids, "c", "down"), null)
    assert.equal(moveCategory(ids, "x", "up"), null)
    assert.deepEqual(ids, ["a", "b", "c"], "the input is left alone")
})

test("isCompleteOrder needs every id exactly once and nothing else", () => {
    const ids = ["a", "b", "c"]
    assert.equal(isCompleteOrder(["c", "a", "b"], ids), true)
    assert.equal(isCompleteOrder(["a", "b"], ids), false, "one missing")
    assert.equal(isCompleteOrder(["a", "a", "b"], ids), false, "a duplicate")
    assert.equal(isCompleteOrder(["a", "b", "z"], ids), false, "an unknown id")
    assert.equal(isCompleteOrder(["a", "b", "c", "d"], ids), false, "too many")
    assert.equal(isCompleteOrder("a,b,c", ids), false, "not an array")
    assert.equal(isCompleteOrder([1, 2, 3], ["1", "2", "3"]), false, "not strings")
})

test("cleanCategoryName trims and collapses spaces, keeping case", () => {
    assert.equal(cleanCategoryName("  Lash   and  Brow "), "Lash and Brow")
})

test("colours: only palette keys are accepted; an unknown stored one falls back", () => {
    assert.equal(isCategoryColor("rose"), true)
    assert.equal(isCategoryColor("Rose"), false)
    assert.equal(isCategoryColor("red; background:url(x)"), false)
    assert.equal(categoryColorOf("teal"), "teal")
    assert.equal(categoryColorOf("removed-colour"), "gold")
})

test("compareCategories orders by position, then name", () => {
    const sorted = [
        { position: 2, name: "Feet" },
        { position: 1, name: "Wax" },
        { position: 1, name: "Hands" },
    ].sort(compareCategories)
    assert.deepEqual(
        sorted.map((c) => c.name),
        ["Hands", "Wax", "Feet"],
    )
})
