export function allocateDiscount(linePriceCents: number[], totalDiscountCents: number): number[] {
    const totalPrice = linePriceCents.reduce((sum, cents) => sum + cents, 0)
    if (totalDiscountCents <= 0 || totalPrice <= 0) return linePriceCents.map(() => 0)

    const parts = linePriceCents.map((cents, index) => {
        const scaled = cents * totalDiscountCents
        return {
            index,
            cents,
            share: Math.floor(scaled / totalPrice),
            remainder: scaled % totalPrice,
        }
    })
    let leftover = totalDiscountCents - parts.reduce((sum, part) => sum + part.share, 0)

    const order = [...parts].sort(
        (a, b) => b.remainder - a.remainder || b.cents - a.cents || a.index - b.index,
    )
    for (const part of order) {
        if (leftover === 0) break
        part.share += 1
        leftover -= 1
    }
    return parts.map((part) => part.share)
}

export function commissionCents(salesCents: number, basisPoints: number): number {
    return Math.round((salesCents * basisPoints) / 10_000)
}
