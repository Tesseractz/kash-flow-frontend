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
      profit: s.profit != null ? Number(s.profit) : null,
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
export function filterTransactions(rows, { q = '', from = '', to = '', type = 'all' } = {}) {
  const needle = q.trim().toLowerCase()
  const fromTs = from ? new Date(`${from}T00:00:00`) : null
  const toTs = to ? new Date(`${to}T23:59:59.999`) : null

  return rows.filter((r) => {
    if (type !== 'all' && r.type !== type) return false
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
  let saleCount = 0
  let returnCount = 0
  for (const r of rows) {
    revenue += r.total
    if (r.profit != null) profit += r.profit
    if (r.type === 'return') returnCount += 1
    else saleCount += 1
  }
  return { count: rows.length, saleCount, returnCount, revenue, profit }
}

function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Build a CSV string from enriched rows (order preserved). */
export function transactionsToCSV(rows) {
  const header = [
    'id', 'date', 'time', 'type', 'payment', 'product', 'sku', 'quantity',
    'unit_price', 'total', 'profit', 'customer', 'sold_by',
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
      r.profit != null ? r.profit.toFixed(2) : '',
      csvEscape(r.customer_name),
      csvEscape(r.sold_by_name),
    ].join(','))
  }
  return lines.join('\r\n')
}
