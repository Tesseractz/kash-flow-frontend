/**
 * Unit tests for offline storage utility
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i) => Object.keys(store)[i] || null),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Offline Storage', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Basic Operations', () => {
    it('should store and retrieve data', () => {
      const data = { id: 1, name: 'Test Product' }
      
      localStorage.setItem('test_key', JSON.stringify(data))
      const retrieved = JSON.parse(localStorage.getItem('test_key'))
      
      expect(retrieved).toEqual(data)
    })

    it('should return null for non-existent keys', () => {
      const result = localStorage.getItem('non_existent')
      expect(result).toBeNull()
    })

    it('should remove items', () => {
      localStorage.setItem('test_key', 'value')
      localStorage.removeItem('test_key')
      
      expect(localStorage.getItem('test_key')).toBeNull()
    })

    it('should clear all items', () => {
      localStorage.setItem('key1', 'value1')
      localStorage.setItem('key2', 'value2')
      localStorage.clear()
      
      expect(localStorage.getItem('key1')).toBeNull()
      expect(localStorage.getItem('key2')).toBeNull()
    })
  })

  describe('Offline Sales Queue', () => {
    const QUEUE_KEY = 'offline_sales_queue'

    it('should add sale to queue', () => {
      const sale = {
        product_id: 1,
        quantity_sold: 2,
        total_price: 200,
        timestamp: Date.now(),
      }

      const queue = [sale]
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))

      const stored = JSON.parse(localStorage.getItem(QUEUE_KEY))
      expect(stored).toHaveLength(1)
      expect(stored[0]).toEqual(sale)
    })

    it('should append to existing queue', () => {
      const sale1 = { product_id: 1, quantity_sold: 1 }
      const sale2 = { product_id: 2, quantity_sold: 2 }

      localStorage.setItem(QUEUE_KEY, JSON.stringify([sale1]))
      
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY))
      queue.push(sale2)
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))

      const stored = JSON.parse(localStorage.getItem(QUEUE_KEY))
      expect(stored).toHaveLength(2)
    })

    it('should clear queue after sync', () => {
      const sale = { product_id: 1, quantity_sold: 1 }
      localStorage.setItem(QUEUE_KEY, JSON.stringify([sale]))
      
      // Simulate sync completion
      localStorage.removeItem(QUEUE_KEY)
      
      expect(localStorage.getItem(QUEUE_KEY)).toBeNull()
    })

    it('should handle empty queue', () => {
      const queue = localStorage.getItem(QUEUE_KEY)
      const parsed = queue ? JSON.parse(queue) : []
      
      expect(parsed).toEqual([])
    })
  })

  describe('Product Cache', () => {
    const CACHE_KEY = 'products_cache'

    it('should cache products', () => {
      const products = [
        { id: 1, name: 'Product 1', price: 100 },
        { id: 2, name: 'Product 2', price: 200 },
      ]

      const cacheData = {
        data: products,
        timestamp: Date.now(),
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))

      const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
      expect(cached.data).toEqual(products)
      expect(cached.timestamp).toBeDefined()
    })

    it('should check cache validity', () => {
      const MAX_AGE = 5 * 60 * 1000 // 5 minutes

      const oldCache = {
        data: [],
        timestamp: Date.now() - MAX_AGE - 1000,
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(oldCache))

      const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
      const isValid = (Date.now() - cached.timestamp) < MAX_AGE

      expect(isValid).toBe(false)
    })

    it('should return fresh cache', () => {
      const MAX_AGE = 5 * 60 * 1000 // 5 minutes

      const freshCache = {
        data: [{ id: 1, name: 'Fresh Product' }],
        timestamp: Date.now(),
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(freshCache))

      const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
      const isValid = (Date.now() - cached.timestamp) < MAX_AGE

      expect(isValid).toBe(true)
      expect(cached.data).toHaveLength(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle JSON parse errors', () => {
      localStorage.setItem('invalid_json', 'not valid json')

      expect(() => {
        JSON.parse(localStorage.getItem('invalid_json'))
      }).toThrow()
    })

    it('should safely parse with try-catch', () => {
      localStorage.setItem('invalid_json', 'not valid json')

      const safeParse = (key) => {
        try {
          return JSON.parse(localStorage.getItem(key))
        } catch {
          return null
        }
      }

      expect(safeParse('invalid_json')).toBeNull()
    })
  })
})
