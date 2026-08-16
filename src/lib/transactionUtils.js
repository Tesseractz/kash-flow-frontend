// Pure helpers for the Transactions manager page: enrichment (joining sales
// rows with products/customers/team members), filtering, sorting and CSV
// export. Kept free of React so they're unit-testable.

/** Join raw /sales rows with lookup maps into display-ready rows. */
export function enrichTransactions(sales, { products = [], customers = [], users = [] } = {}) {
  const productMap = new Map(products.map((p) => [p.id, p]))
  const customerMap = new Map(customers.map((c) => [c.id, c]))
  const userMap = new Map(users.map((u) => [u.id, u]))

  return (sales || []).map((s) => {
    const product = productMap.get(s.product_id)
    const customer = s.customer_id != null ? customerMap.get(s.customer_id) : null
    const soldBy = s.sold_by ? userMap.get(s.sold_by) : null
    const qty = Number(s.quantity_sold) || 0
    const total = Number(s.total_price) || 0
    const isReturn = qty < 0 || total < 0
    const profit = s.profit != null ? Number(s.profit) : null
    // Cost of goods is derived, not stored on the sale: the row records what
    // was charged and what was earned, so the difference is what it cost us.
    const cost = profit != null ? total - profit : null
    // Margin is meaningless without revenue to divide by.
    const margin = profit != null && total !== 0 ? (profit / total) * 100 : null
    return {
      id: s.id,
      timestamp: s.timestamp,
      product_id: s.product_id,
      product_name: product?.name || `Product #${s.product_id}`,
      sku: product?.sku || '',
      image_url: product?.image_url || null,
      quantity: qty,
      unit_price: qty !== 0 ? Math.abs(total / qty) : Math.abs(total),
      total,
      cost,
      profit,
      margin,
      customer_name: customer?.name || '',
      sold_by_name: soldBy?.name || soldBy?.email || '',
      payment_method: s.payment_method || '',
      type: isReturn ? 'return' : 'sale',
    }
  })
}

/**
 * Filter enriched rows.
 * @param {object} f {q, from, to, type} — from/to are 'YYYY-MM-DD' local dates,
 *   type is 'all' | 'sale' | 'return'.
 */
export function filterTransactions(rows, { q = '', from = '', to = '', type = 'all', payment = 'all' } = {}) {
  const needle = q.trim().toLowerCase()
  const fromTs = from ? new Date(`${from}T00:00:00`) : null
  const toTs = to ? new Date(`${to}T23:59:59.999`) : null

  return rows.filter((r) => {
    if (type !== 'all' && r.type !== type) return false
    if (payment !== 'all') {
      // Sales taken before the payment method was recorded have no value, and
      // must not silently count as either cash or card.
      if (payment === 'unspecified' ? r.payment_method : r.payment_method !== payment) return false
    }
    const t = new Date(r.timestamp)
    if (fromTs && (Number.isNaN(t.getTime()) || t < fromTs)) return false
    if (toTs && (Number.isNaN(t.getTime()) || t > toTs)) return false
    if (needle) {
      const hay = `#${r.id} ${r.product_name} ${r.sku} ${r.customer_name} ${r.sold_by_name}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
}

const SORTERS = {
  timestamp: (r) => new Date(r.timestamp).getTime() || 0,
  total: (r) => r.total,
  quantity: (r) => r.quantity,
  profit: (r) => r.profit ?? -Infinity,
  product: (r) => r.product_name.toLowerCase(),
  id: (r) => r.id,
}

export function sortTransactions(rows, key = 'timestamp', dir = 'desc') {
  const get = SORTERS[key] || SORTERS.timestamp
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = get(a)
    const bv = get(b)
    if (av < bv) return -1 * mul
    if (av > bv) return 1 * mul
    return 0
  })
}

export function transactionTotals(rows) {
  let revenue = 0
  let profit = 0
  let cost = 0
  let items = 0
  let saleCount = 0
  let returnCount = 0
  let cashRevenue = 0
  let cardRevenue = 0
  let refunded = 0
  for (const r of rows) {
    revenue += r.total
    if (r.profit != null) profit += r.profit
    if (r.cost != null) cost += r.cost
    if (r.type === 'return') {
      returnCount += 1
      refunded += Math.abs(r.total)
    } else {
      saleCount += 1
      items += r.quantity
    }
    if (r.payment_method === 'cash') cashRevenue += r.total
    else if (r.payment_method === 'card') cardRevenue += r.total
  }
  // Margin over the whole selection, not an average of per-row margins —
  // averaging percentages would let a R5 sale weigh as much as a R5,000 one.
  const margin = revenue !== 0 ? (profit / revenue) * 100 : null
  return {
    count: rows.length,
    saleCount,
    returnCount,
    revenue,
    profit,
    cost,
    margin,
    items,
    cashRevenue,
    cardRevenue,
    refunded,
  }
}

function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Build a CSV string from enriched rows (order preserved). */
export function transactionsToCSV(rows) {
  const header = [
    'id', 'date', 'time', 'type', 'payment', 'product', 'sku', 'quantity',
    'unit_price', 'total', 'cost', 'profit', 'margin_pct', 'customer', 'sold_by',
  ]
  const lines = [header.join(',')]
  for (const r of rows) {
    const t = new Date(r.timestamp)
    const valid = !Number.isNaN(t.getTime())
    lines.push([
      r.id,
      valid ? t.toISOString().slice(0, 10) : '',
      valid ? t.toTimeString().slice(0, 8) : '',
      r.type,
      r.payment_method || '',
      csvEscape(r.product_name),
      csvEscape(r.sku),
      r.quantity,
      r.unit_price.toFixed(2),
      r.total.toFixed(2),
      r.cost != null ? r.cost.toFixed(2) : '',
      r.profit != null ? r.profit.toFixed(2) : '',
      r.margin != null ? r.margin.toFixed(1) : '',
      csvEscape(r.customer_name),
      csvEscape(r.sold_by_name),
    ].join(','))
  }
  return lines.join('\r\n')
}
