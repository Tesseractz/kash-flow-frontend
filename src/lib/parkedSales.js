// Parked ("held") sales: save the current cart aside, serve the next
// customer, recall it later. Pure localStorage — survives reloads and works
// offline. Storage shape: [{ id, at, cart, customer, paymentMethod }]

import { loadFromStorage, saveToStorage } from './offlineStorage'

export const PARKED_SALES_KEY = 'kashpoint_parked_carts_v1'

export function getParkedSales() {
  const list = loadFromStorage(PARKED_SALES_KEY, [])
  return Array.isArray(list) ? list : []
}

export function setParkedSales(list) {
  saveToStorage(PARKED_SALES_KEY, Array.isArray(list) ? list : [])
}

export function parkSale({ cart, customer = null, paymentMethod = 'cash' }) {
  if (!Array.isArray(cart) || cart.length === 0) return getParkedSales()
  const entry = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `park-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    cart: cart.map((item) => ({
      product: {
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        image_url: item.product.image_url || null,
      },
      quantity: item.quantity,
    })),
    customer,
    paymentMethod,
  }
  const next = [entry, ...getParkedSales()]
  setParkedSales(next)
  return next
}

export function removeParkedSale(id) {
  const next = getParkedSales().filter((p) => p.id !== id)
  setParkedSales(next)
  return next
}

export function parkedSaleTotal(entry) {
  return (entry?.cart || []).reduce(
    (sum, item) => sum + (Number(item.product?.price) || 0) * (item.quantity || 0),
    0
  )
}

/**
 * Rebuild a parked cart against the CURRENT product list: re-attach live
 * product rows (fresh stock/price) and clamp quantities to available stock.
 * Returns { cart, warnings } — warnings name items that were clamped/dropped.
 */
export function resumeParkedCart(entry, currentProducts) {
  const cart = []
  const warnings = []
  for (const item of entry?.cart || []) {
    const live = (currentProducts || []).find((p) => p.id === item.product.id)
    if (!live) {
      warnings.push(`${item.product.name} no longer exists`)
      continue
    }
    if ((live.quantity || 0) <= 0) {
      warnings.push(`${live.name} is out of stock`)
      continue
    }
    const qty = Math.min(item.quantity, live.quantity)
    if (qty < item.quantity) {
      warnings.push(`${live.name}: only ${live.quantity} left (had ${item.quantity})`)
    }
    cart.push({ product: live, quantity: qty })
  }
  return { cart, warnings }
}
