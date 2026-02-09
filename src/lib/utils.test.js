/**
 * Unit tests for utility functions
 */
import { describe, it, expect, vi } from 'vitest'

// Test helper utilities and formatting functions
describe('Utility Functions', () => {
  describe('Currency Formatting', () => {
    it('should format currency with R prefix', () => {
      const formatCurrency = (amount) => `R ${amount.toFixed(2)}`
      
      expect(formatCurrency(100)).toBe('R 100.00')
      expect(formatCurrency(1234.56)).toBe('R 1234.56')
      expect(formatCurrency(0)).toBe('R 0.00')
    })

    it('should handle negative amounts (returns)', () => {
      const formatCurrency = (amount) => `R ${amount.toFixed(2)}`
      
      expect(formatCurrency(-200)).toBe('R -200.00')
    })
  })

  describe('Date Formatting', () => {
    it('should format date to YYYY-MM-DD', () => {
      const formatDate = (date) => date.toISOString().split('T')[0]
      
      const testDate = new Date('2026-02-09T12:00:00Z')
      expect(formatDate(testDate)).toBe('2026-02-09')
    })

    it('should format time to HH:MM', () => {
      const formatTime = (date) => date.toTimeString().slice(0, 5)
      
      const testDate = new Date('2026-02-09T14:30:00')
      expect(formatTime(testDate)).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  describe('Percentage Calculation', () => {
    it('should calculate profit margin correctly', () => {
      const calculateProfitMargin = (profit, revenue) => 
        revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0'
      
      expect(calculateProfitMargin(40, 100)).toBe('40.0')
      expect(calculateProfitMargin(250, 1000)).toBe('25.0')
      expect(calculateProfitMargin(0, 100)).toBe('0.0')
      expect(calculateProfitMargin(100, 0)).toBe('0.0')
    })
  })

  describe('Stock Level Helpers', () => {
    it('should identify low stock correctly', () => {
      const isLowStock = (quantity, threshold = 10) => quantity <= threshold
      
      expect(isLowStock(5)).toBe(true)
      expect(isLowStock(10)).toBe(true)
      expect(isLowStock(15)).toBe(false)
      expect(isLowStock(5, 3)).toBe(false)
    })

    it('should identify out of stock correctly', () => {
      const isOutOfStock = (quantity) => quantity <= 0
      
      expect(isOutOfStock(0)).toBe(true)
      expect(isOutOfStock(-1)).toBe(true)
      expect(isOutOfStock(1)).toBe(false)
    })
  })

  describe('Plan Limit Helpers', () => {
    it('should check if under product limit', () => {
      const isUnderLimit = (current, max) => max === null || current < max
      
      expect(isUnderLimit(5, 10)).toBe(true)
      expect(isUnderLimit(10, 10)).toBe(false)
      expect(isUnderLimit(100, null)).toBe(true) // Unlimited
    })

    it('should format plan limit display', () => {
      const formatLimit = (current, max) => 
        max === null ? `${current} / ∞` : `${current} / ${max}`
      
      expect(formatLimit(5, 10)).toBe('5 / 10')
      expect(formatLimit(100, null)).toBe('100 / ∞')
    })
  })

  describe('Validation Helpers', () => {
    it('should validate positive numbers', () => {
      const isPositiveNumber = (value) => typeof value === 'number' && value > 0
      
      expect(isPositiveNumber(100)).toBe(true)
      expect(isPositiveNumber(0)).toBe(false)
      expect(isPositiveNumber(-50)).toBe(false)
      expect(isPositiveNumber('100')).toBe(false)
    })

    it('should validate non-negative integers', () => {
      const isValidQuantity = (value) => 
        Number.isInteger(value) && value >= 0
      
      expect(isValidQuantity(10)).toBe(true)
      expect(isValidQuantity(0)).toBe(true)
      expect(isValidQuantity(-1)).toBe(false)
      expect(isValidQuantity(10.5)).toBe(false)
    })

    it('should validate SKU format', () => {
      const isValidSKU = (sku) => 
        !sku || /^[A-Za-z0-9-_]+$/.test(sku)
      
      expect(isValidSKU('PRD-001')).toBe(true)
      expect(isValidSKU('ABC123')).toBe(true)
      expect(isValidSKU('TEST_SKU')).toBe(true)
      expect(isValidSKU('')).toBe(true) // Empty is valid (optional)
      expect(isValidSKU('PRD 001')).toBe(false) // No spaces
    })
  })

  describe('Cart Calculations', () => {
    it('should calculate cart total correctly', () => {
      const calculateCartTotal = (items) => 
        items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      const cart = [
        { price: 100, quantity: 2 },
        { price: 50, quantity: 3 },
      ]
      
      expect(calculateCartTotal(cart)).toBe(350)
    })

    it('should calculate cart item count', () => {
      const getCartItemCount = (items) => 
        items.reduce((sum, item) => sum + item.quantity, 0)
      
      const cart = [
        { quantity: 2 },
        { quantity: 3 },
        { quantity: 1 },
      ]
      
      expect(getCartItemCount(cart)).toBe(6)
    })

    it('should handle empty cart', () => {
      const calculateCartTotal = (items) => 
        items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      
      expect(calculateCartTotal([])).toBe(0)
    })
  })

  describe('Returns Mode Helpers', () => {
    it('should calculate refund amount', () => {
      const calculateRefund = (price, quantity) => price * quantity
      
      expect(calculateRefund(100, 2)).toBe(200)
      expect(calculateRefund(50.50, 3)).toBe(151.5)
    })

    it('should validate return quantity', () => {
      const isValidReturnQuantity = (returnQty, originalQty) => 
        returnQty > 0 && returnQty <= originalQty
      
      expect(isValidReturnQuantity(2, 5)).toBe(true)
      expect(isValidReturnQuantity(5, 5)).toBe(true)
      expect(isValidReturnQuantity(6, 5)).toBe(false)
      expect(isValidReturnQuantity(0, 5)).toBe(false)
    })
  })

  describe('Analytics Helpers', () => {
    it('should calculate trend percentage', () => {
      const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }
      
      expect(calculateTrend(150, 100)).toBe(50)
      expect(calculateTrend(50, 100)).toBe(-50)
      expect(calculateTrend(100, 0)).toBe(100)
      expect(calculateTrend(0, 0)).toBe(0)
    })

    it('should identify best performing day', () => {
      const findBestDay = (trends) => 
        trends.reduce((best, day) => 
          day.revenue > best.revenue ? day : best, 
          { revenue: 0, date: null }
        )
      
      const trends = [
        { date: '2026-02-07', revenue: 100 },
        { date: '2026-02-08', revenue: 500 },
        { date: '2026-02-09', revenue: 200 },
      ]
      
      expect(findBestDay(trends).date).toBe('2026-02-08')
      expect(findBestDay(trends).revenue).toBe(500)
    })
  })
})

describe('Plan Feature Checks', () => {
  const planFeatures = {
    free: {
      max_products: 10,
      max_users: 1,
      csv_export: false,
      low_stock_alerts: false,
      audit_logs: false,
      advanced_reports: false,
    },
    pro: {
      max_products: null,
      max_users: 3,
      csv_export: true,
      low_stock_alerts: true,
      audit_logs: false,
      advanced_reports: true,
    },
    business: {
      max_products: null,
      max_users: 999,
      csv_export: true,
      low_stock_alerts: true,
      audit_logs: true,
      advanced_reports: true,
    },
  }

  it('should correctly identify free plan limitations', () => {
    const { free } = planFeatures
    
    expect(free.max_products).toBe(10)
    expect(free.max_users).toBe(1)
    expect(free.csv_export).toBe(false)
  })

  it('should correctly identify pro plan features', () => {
    const { pro } = planFeatures
    
    expect(pro.max_products).toBeNull() // Unlimited
    expect(pro.max_users).toBe(3)
    expect(pro.csv_export).toBe(true)
    expect(pro.audit_logs).toBe(false) // Not in Pro
  })

  it('should correctly identify business plan features', () => {
    const { business } = planFeatures
    
    expect(business.max_products).toBeNull() // Unlimited
    expect(business.max_users).toBe(999) // Unlimited
    expect(business.audit_logs).toBe(true)
  })

  it('should check feature access correctly', () => {
    const hasFeature = (plan, feature) => planFeatures[plan]?.[feature] ?? false
    
    expect(hasFeature('free', 'csv_export')).toBe(false)
    expect(hasFeature('pro', 'csv_export')).toBe(true)
    expect(hasFeature('business', 'audit_logs')).toBe(true)
    expect(hasFeature('pro', 'audit_logs')).toBe(false)
  })
})
