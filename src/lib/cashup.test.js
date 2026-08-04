import { describe, it, expect } from 'vitest'
import { salesForDay, cashupSummary, drawerVariance, cashupText } from './cashup'

const rows = [
  { id: 1, total_price: 100, quantity_sold: 2, payment_method: 'cash', timestamp: '2026-08-03T09:00:00' },
  { id: 2, total_price: 200, quantity_sold: 1, payment_method: 'card', timestamp: '2026-08-03T11:00:00' },
  { id: 3, total_price: 50, quantity_sold: 1, payment_method: null, timestamp: '2026-08-03T12:00:00' },
  { id: 4, total_price: -30, quantity_sold: -1, payment_method: null, timestamp: '2026-08-03T15:00:00' },
  { id: 5, total_price: 999, quantity_sold: 1, payment_method: 'cash', timestamp: '2026-08-02T09:00:00' }, // other day
]

describe('salesForDay', () => {
  it('keeps only rows on the local date', () => {
    expect(salesForDay(rows, '2026-08-03').map((r) => r.id)).toEqual([1, 2, 3, 4])
  })
})

describe('cashupSummary', () => {
  const day = salesForDay(rows, '2026-08-03')

  it('buckets cash/card/unknown and refunds', () => {
    const s = cashupSummary(day)
    expect(s.cashSales).toBe(100)
    expect(s.cardSales).toBe(200)
    expect(s.unknownSales).toBe(50)
    expect(s.refunds).toBe(30)
    expect(s.saleCount).toBe(3)
    expect(s.returnCount).toBe(1)
    expect(s.grossSales).toBe(350)
    expect(s.netTotal).toBe(320)
  })

  it('treatUnknownAsCash toggles the drawer expectation', () => {
    expect(cashupSummary(day).cashInDrawerSales).toBe(150)
    expect(cashupSummary(day, { treatUnknownAsCash: false }).cashInDrawerSales).toBe(100)
  })
})

describe('drawerVariance', () => {
  it('computes expected = float + cash sales - refunds', () => {
    const s = cashupSummary(salesForDay(rows, '2026-08-03'))
    const d = drawerVariance(s, 500, 615)
    expect(d.expected).toBe(500 + 150 - 30) // 620
    expect(d.variance).toBe(-5) // short by R5
  })
})

describe('cashupText', () => {
  it('renders a shareable summary', () => {
    const s = cashupSummary(salesForDay(rows, '2026-08-03'))
    const d = { ...drawerVariance(s, 500, 615), float: 500 }
    const text = cashupText('2026-08-03', 'LG20', s, d)
    expect(text).toContain('*LG20*')
    expect(text).toContain('Cash: R 100.00')
    expect(text).toContain('Expected cash: R 620.00')
    expect(text).toContain('Variance: −R 5.00')
  })
})
