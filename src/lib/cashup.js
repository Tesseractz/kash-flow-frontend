// End-of-day cash-up math. Pure functions — unit tested.
//
// Sales rows carry payment_method 'cash' | 'card' | null (legacy rows predate
// the column). Returns are negative rows; refunds are assumed to be paid out
// of the drawer in cash (standard small-shop practice).

/** Keep only rows whose LOCAL date matches `dateISO` (YYYY-MM-DD). */
export function salesForDay(sales, dateISO) {
  const start = new Date(`${dateISO}T00:00:00`)
  const end = new Date(`${dateISO}T23:59:59.999`)
  return (sales || []).filter((s) => {
    const t = new Date(s.timestamp)
    return !Number.isNaN(t.getTime()) && t >= start && t <= end
  })
}

/**
 * Bucket a day's rows for the cash-up.
 * @param {boolean} treatUnknownAsCash legacy rows (null payment_method) counted as cash
 */
export function cashupSummary(dayRows, { treatUnknownAsCash = true } = {}) {
  let cashSales = 0
  let cardSales = 0
  let unknownSales = 0
  let refunds = 0 // positive number = amount paid out
  let saleCount = 0
  let returnCount = 0

  for (const s of dayRows) {
    const total = Number(s.total_price) || 0
    if (total < 0 || (Number(s.quantity_sold) || 0) < 0) {
      refunds += Math.abs(total)
      returnCount += 1
      continue
    }
    saleCount += 1
    if (s.payment_method === 'cash') cashSales += total
    else if (s.payment_method === 'card') cardSales += total
    else unknownSales += total
  }

  const cashInDrawerSales = cashSales + (treatUnknownAsCash ? unknownSales : 0)
  return {
    saleCount,
    returnCount,
    cashSales,
    cardSales,
    unknownSales,
    refunds,
    grossSales: cashSales + cardSales + unknownSales,
    netTotal: cashSales + cardSales + unknownSales - refunds,
    cashInDrawerSales,
  }
}

/** Expected drawer contents and variance against the counted amount. */
export function drawerVariance(summary, openingFloat, countedCash) {
  const float = Number(openingFloat) || 0
  const counted = Number(countedCash) || 0
  const expected = float + summary.cashInDrawerSales - summary.refunds
  return { expected, counted, variance: counted - expected }
}

/** Plain-text day summary (for WhatsApp/clipboard). */
export function cashupText(dateISO, storeName, summary, drawer) {
  const R = (n) => `R ${(Number(n) || 0).toFixed(2)}`
  const lines = [
    `*${storeName || 'Store'}* — day-end summary ${dateISO}`,
    ``,
    `Sales: ${summary.saleCount} (${R(summary.grossSales)})`,
    `• Cash: ${R(summary.cashSales)}`,
    `• Card: ${R(summary.cardSales)}`,
  ]
  if (summary.unknownSales > 0) lines.push(`• Unspecified: ${R(summary.unknownSales)}`)
  if (summary.returnCount > 0) lines.push(`Refunds: ${summary.returnCount} (−${R(summary.refunds)})`)
  lines.push(`Net: ${R(summary.netTotal)}`)
  if (drawer) {
    lines.push(
      ``,
      `Drawer float: ${R(drawer.float ?? 0)}`,
      `Expected cash: ${R(drawer.expected)}`,
      `Counted cash: ${R(drawer.counted)}`,
      `Variance: ${drawer.variance >= 0 ? '+' : '−'}${R(Math.abs(drawer.variance))}`,
    )
  }
  return lines.join('\n')
}
