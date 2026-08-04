import { describe, it, expect, beforeEach } from 'vitest'
import {
  PARKED_SALES_KEY,
  getParkedSales,
  parkSale,
  removeParkedSale,
  parkedSaleTotal,
  resumeParkedCart,
} from './parkedSales'

const product = (id, overrides = {}) => ({
  id,
  name: `Product ${id}`,
  price: 50,
  quantity: 10,
  image_url: null,
  ...overrides,
})

describe('parkedSales', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns [] when nothing is stored or storage is corrupt', () => {
    expect(getParkedSales()).toEqual([])
    localStorage.setItem(PARKED_SALES_KEY, '{not json')
    expect(getParkedSales()).toEqual([])
  })

  it('parks a cart with customer and payment method, newest first', () => {
    parkSale({ cart: [{ product: product(1), quantity: 2 }], paymentMethod: 'cash' })
    const next = parkSale({
      cart: [{ product: product(2), quantity: 1 }],
      customer: { id: 9, name: 'Thabo' },
      paymentMethod: 'card',
    })
    expect(next).toHaveLength(2)
    expect(next[0].customer.name).toBe('Thabo')
    expect(next[0].paymentMethod).toBe('card')
    expect(next[0].cart[0].product.id).toBe(2)
    // persisted
    expect(getParkedSales()).toHaveLength(2)
  })

  it('ignores empty carts', () => {
    expect(parkSale({ cart: [] })).toEqual([])
    expect(getParkedSales()).toEqual([])
  })

  it('computes the total of a parked entry', () => {
    const list = parkSale({
      cart: [
        { product: product(1, { price: 25 }), quantity: 2 },
        { product: product(2, { price: 10.5 }), quantity: 1 },
      ],
    })
    expect(parkedSaleTotal(list[0])).toBeCloseTo(60.5)
  })

  it('removes a parked entry by id', () => {
    const list = parkSale({ cart: [{ product: product(1), quantity: 1 }] })
    expect(removeParkedSale(list[0].id)).toEqual([])
    expect(getParkedSales()).toEqual([])
  })

  it('resume clamps quantities to current stock and drops missing/out-of-stock items', () => {
    const list = parkSale({
      cart: [
        { product: product(1), quantity: 5 }, // stock will drop to 3 → clamp
        { product: product(2), quantity: 1 }, // will be deleted → drop
        { product: product(3), quantity: 2 }, // out of stock → drop
        { product: product(4), quantity: 1 }, // unchanged
      ],
    })
    const current = [
      product(1, { quantity: 3, price: 60 }), // fresh price too
      product(3, { quantity: 0 }),
      product(4),
    ]
    const { cart, warnings } = resumeParkedCart(list[0], current)

    expect(cart).toHaveLength(2)
    expect(cart[0].product.id).toBe(1)
    expect(cart[0].quantity).toBe(3) // clamped
    expect(cart[0].product.price).toBe(60) // live product row re-attached
    expect(cart[1].product.id).toBe(4)
    expect(warnings).toHaveLength(3) // clamp + missing + out-of-stock
  })
})
