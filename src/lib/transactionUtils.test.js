import { describe, it, expect } from 'vitest'
import {
  enrichTransactions,
  filterTransactions,
  sortTransactions,
  transactionTotals,
  transactionsToCSV,
} from './transactionUtils'

const products = [
  { id: 1, name: 'Mouse', sku: 'MSE-1', image_url: 'x.png' },
  { id: 2, name: 'Cable', sku: 'CBL-2', image_url: null },
]
const customers = [{ id: 7, name: 'Thabo' }]
const users = [{ id: 'u1', name: 'Naledi' }, { id: 'u2', email: 'cashier@store.local' }]

const sales = [
  { id: 10, product_id: 1, quantity_sold: 2, total_price: 100, profit: 40, timestamp: '2026-08-03T09:15:00Z', sold_by: 'u1', customer_id: 7 },
  { id: 11, product_id: 2, quantity_sold: 1, total_price: 25, profit: 5, timestamp: '2026-08-02T14:00:00Z', sold_by: 'u2' },
  { id: 12, product_id: 1, quantity_sold: -1, total_price: -50, profit: -20, timestamp: '2026-08-03T16:30:00Z', sold_by: 'u1' },
  { id: 13, product_id: 999, quantity_sold: 1, total_price: 10, timestamp: '2026-07-01T08:00:00Z' },
]

const rows = enrichTransactions(sales, { products, customers, users })

describe('enrichTransactions', () => {
  it('joins product, customer and user names', () => {
    expect(rows[0]).toMatchObject({
      product_name: 'Mouse',
      sku: 'MSE-1',
      customer_name: 'Thabo',
      sold_by_name: 'Naledi',
      type: 'sale',
      unit_price: 50,
    })
    expect(rows[1].sold_by_name).toBe('cashier@store.local')
  })

  it('marks negative rows as returns and handles unknown products', () => {
    expect(rows[2].type).toBe('return')
    expect(rows[3].product_name).toBe('Product #999')
    expect(rows[3].profit).toBeNull()
  })
})

describe('filterTransactions', () => {
  it('filters by type', () => {
    expect(filterTransactions(rows, { type: 'return' })).toHaveLength(1)
    expect(filterTransactions(rows, { type: 'sale' })).toHaveLength(3)
  })

  it('filters by date range (inclusive)', () => {
    const aug3 = filterTransactions(rows, { from: '2026-08-03', to: '2026-08-03' })
    expect(aug3.map((r) => r.id).sort()).toEqual([10, 12])
  })

  it('searches across product, sku, customer, seller and id', () => {
    expect(filterTransactions(rows, { q: 'thabo' })).toHaveLength(1)
    expect(filterTransactions(rows, { q: 'CBL' })).toHaveLength(1)
    expect(filterTransactions(rows, { q: '#12' })).toHaveLength(1)
    expect(filterTransactions(rows, { q: 'naledi' })).toHaveLength(2)
  })
})

describe('sortTransactions', () => {
  it('sorts by total descending by request', () => {
    const sorted = sortTransactions(rows, 'total', 'desc')
    expect(sorted[0].id).toBe(10)
    expect(sorted[sorted.length - 1].id).toBe(12)
  })

  it('defaults to newest first', () => {
    const sorted = sortTransactions(rows)
    expect(sorted[0].id).toBe(12) // 16:30 on Aug 3
  })
})

describe('transactionTotals', () => {
  it('nets revenue and counts sales vs returns', () => {
    const t = transactionTotals(rows)
    expect(t.count).toBe(4)
    expect(t.saleCount).toBe(3)
    expect(t.returnCount).toBe(1)
    expect(t.revenue).toBeCloseTo(85) // 100 + 25 - 50 + 10
    expect(t.profit).toBeCloseTo(25) // 40 + 5 - 20 (null ignored)
  })
})

describe('transactionsToCSV', () => {
  it('produces a header and one line per row, escaping as needed', () => {
    const withComma = enrichTransactions(
      [{ id: 1, product_id: 5, quantity_sold: 1, total_price: 10, timestamp: '2026-08-03T10:00:00Z' }],
      { products: [{ id: 5, name: 'Plug, 2-pin "EU"', sku: '' }] }
    )
    const csv = transactionsToCSV(withComma)
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[0].startsWith('id,date,time,type,payment,product')).toBe(true)
    expect(lines[1]).toContain('"Plug, 2-pin ""EU"""')
  })
})
