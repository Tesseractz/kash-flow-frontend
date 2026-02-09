/**
 * Unit tests for Categories, Customers, and Discounts API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mock functions before vi.mock hoisting
const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}))

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
  },
}))

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
  },
}))

import { CategoriesAPI, CustomersAPI, DiscountsAPI } from './client.js'

describe('CategoriesAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list categories', async () => {
    const mockCategories = [
      { id: 'cat-1', name: 'Beverages', color: '#6366f1' },
      { id: 'cat-2', name: 'Snacks', color: '#22c55e' },
    ]

    mockGet.mockResolvedValueOnce({ data: mockCategories })

    const result = await CategoriesAPI.list()

    expect(result).toEqual(mockCategories)
    expect(mockGet).toHaveBeenCalledWith('/categories', { params: { include_inactive: false } })
  })

  it('should list categories including inactive', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })

    await CategoriesAPI.list(true)

    expect(mockGet).toHaveBeenCalledWith('/categories', { params: { include_inactive: true } })
  })

  it('should create a category', async () => {
    const newCategory = { name: 'Electronics', color: '#3b82f6' }
    const createdCategory = { id: 'cat-new', ...newCategory }

    mockPost.mockResolvedValueOnce({ data: createdCategory })

    const result = await CategoriesAPI.create(newCategory)

    expect(result).toEqual(createdCategory)
    expect(mockPost).toHaveBeenCalledWith('/categories', newCategory)
  })

  it('should update a category', async () => {
    const updateData = { name: 'Updated Name' }
    const updatedCategory = { id: 'cat-1', name: 'Updated Name', color: '#6366f1' }

    mockPut.mockResolvedValueOnce({ data: updatedCategory })

    const result = await CategoriesAPI.update('cat-1', updateData)

    expect(result).toEqual(updatedCategory)
    expect(mockPut).toHaveBeenCalledWith('/categories/cat-1', updateData)
  })

  it('should delete a category', async () => {
    mockDelete.mockResolvedValueOnce({ data: null })

    await CategoriesAPI.remove('cat-1')

    expect(mockDelete).toHaveBeenCalledWith('/categories/cat-1')
  })
})

describe('CustomersAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list customers', async () => {
    const mockCustomers = [
      { id: 'cust-1', name: 'John Doe', email: 'john@example.com' },
      { id: 'cust-2', name: 'Jane Smith', phone: '+27123456789' },
    ]

    mockGet.mockResolvedValueOnce({ data: mockCustomers })

    const result = await CustomersAPI.list()

    expect(result).toEqual(mockCustomers)
  })

  it('should search customers', async () => {
    mockGet.mockResolvedValueOnce({ data: [] })

    await CustomersAPI.list({ q: 'john' })

    expect(mockGet).toHaveBeenCalledWith('/customers', { params: { q: 'john' } })
  })

  it('should get a single customer', async () => {
    const mockCustomer = { id: 'cust-1', name: 'John Doe', loyalty_points: 100 }

    mockGet.mockResolvedValueOnce({ data: mockCustomer })

    const result = await CustomersAPI.get('cust-1')

    expect(result).toEqual(mockCustomer)
    expect(mockGet).toHaveBeenCalledWith('/customers/cust-1')
  })

  it('should get customer purchases', async () => {
    const mockPurchases = [
      { id: 1, product_id: 1, quantity_sold: 2, total_price: 200 },
    ]

    mockGet.mockResolvedValueOnce({ data: mockPurchases })

    const result = await CustomersAPI.getPurchases('cust-1', 10)

    expect(result).toEqual(mockPurchases)
    expect(mockGet).toHaveBeenCalledWith('/customers/cust-1/purchases', { params: { limit: 10 } })
  })

  it('should create a customer', async () => {
    const newCustomer = { name: 'New Customer', email: 'new@example.com' }
    const createdCustomer = { id: 'cust-new', ...newCustomer, loyalty_points: 0 }

    mockPost.mockResolvedValueOnce({ data: createdCustomer })

    const result = await CustomersAPI.create(newCustomer)

    expect(result).toEqual(createdCustomer)
    expect(mockPost).toHaveBeenCalledWith('/customers', newCustomer)
  })

  it('should update a customer', async () => {
    const updateData = { name: 'Updated Name' }
    const updatedCustomer = { id: 'cust-1', name: 'Updated Name' }

    mockPut.mockResolvedValueOnce({ data: updatedCustomer })

    const result = await CustomersAPI.update('cust-1', updateData)

    expect(result).toEqual(updatedCustomer)
    expect(mockPut).toHaveBeenCalledWith('/customers/cust-1', updateData)
  })

  it('should delete a customer', async () => {
    mockDelete.mockResolvedValueOnce({ data: null })

    await CustomersAPI.remove('cust-1')

    expect(mockDelete).toHaveBeenCalledWith('/customers/cust-1')
  })

  it('should add loyalty points', async () => {
    const updatedCustomer = { id: 'cust-1', name: 'John', loyalty_points: 110 }

    mockPost.mockResolvedValueOnce({ data: updatedCustomer })

    const result = await CustomersAPI.addPoints('cust-1', 10)

    expect(result).toEqual(updatedCustomer)
    expect(mockPost).toHaveBeenCalledWith('/customers/cust-1/add-points', null, { params: { points: 10 } })
  })
})

describe('DiscountsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list discounts', async () => {
    const mockDiscounts = [
      { id: 'disc-1', name: '10% Off', discount_type: 'percentage', discount_value: 10 },
      { id: 'disc-2', name: 'R50 Off', discount_type: 'fixed', discount_value: 50 },
    ]

    mockGet.mockResolvedValueOnce({ data: mockDiscounts })

    const result = await DiscountsAPI.list()

    expect(result).toEqual(mockDiscounts)
  })

  it('should get a single discount', async () => {
    const mockDiscount = { id: 'disc-1', name: '10% Off', discount_type: 'percentage' }

    mockGet.mockResolvedValueOnce({ data: mockDiscount })

    const result = await DiscountsAPI.get('disc-1')

    expect(result).toEqual(mockDiscount)
    expect(mockGet).toHaveBeenCalledWith('/discounts/disc-1')
  })

  it('should create a percentage discount', async () => {
    const newDiscount = {
      name: 'Summer Sale',
      discount_type: 'percentage',
      discount_value: 20,
      code: 'SUMMER20',
    }
    const createdDiscount = { id: 'disc-new', ...newDiscount, usage_count: 0 }

    mockPost.mockResolvedValueOnce({ data: createdDiscount })

    const result = await DiscountsAPI.create(newDiscount)

    expect(result).toEqual(createdDiscount)
    expect(mockPost).toHaveBeenCalledWith('/discounts', newDiscount)
  })

  it('should create a fixed discount', async () => {
    const newDiscount = {
      name: 'R100 Off',
      discount_type: 'fixed',
      discount_value: 100,
      min_purchase_amount: 500,
    }
    const createdDiscount = { id: 'disc-new', ...newDiscount }

    mockPost.mockResolvedValueOnce({ data: createdDiscount })

    const result = await DiscountsAPI.create(newDiscount)

    expect(result).toEqual(createdDiscount)
  })

  it('should update a discount', async () => {
    const updateData = { name: 'Updated Sale', discount_value: 25 }
    const updatedDiscount = { id: 'disc-1', ...updateData }

    mockPut.mockResolvedValueOnce({ data: updatedDiscount })

    const result = await DiscountsAPI.update('disc-1', updateData)

    expect(result).toEqual(updatedDiscount)
    expect(mockPut).toHaveBeenCalledWith('/discounts/disc-1', updateData)
  })

  it('should delete a discount', async () => {
    mockDelete.mockResolvedValueOnce({ data: null })

    await DiscountsAPI.remove('disc-1')

    expect(mockDelete).toHaveBeenCalledWith('/discounts/disc-1')
  })

  it('should apply a discount code', async () => {
    const applyResponse = {
      discount_id: 'disc-1',
      discount_name: '20% Off',
      discount_type: 'percentage',
      discount_value: 20,
      discount_amount: 100,
      final_total: 400,
    }

    mockPost.mockResolvedValueOnce({ data: applyResponse })

    const result = await DiscountsAPI.apply('SAVE20', 500)

    expect(result).toEqual(applyResponse)
    expect(mockPost).toHaveBeenCalledWith('/discounts/apply', {
      code: 'SAVE20',
      cart_total: 500,
      customer_id: null,
    })
  })

  it('should apply discount with customer ID', async () => {
    const applyResponse = {
      discount_id: 'disc-1',
      discount_name: 'Loyalty Discount',
      discount_type: 'percentage',
      discount_value: 15,
      discount_amount: 75,
      final_total: 425,
    }

    mockPost.mockResolvedValueOnce({ data: applyResponse })

    const result = await DiscountsAPI.apply('LOYAL15', 500, 'cust-123')

    expect(result).toEqual(applyResponse)
    expect(mockPost).toHaveBeenCalledWith('/discounts/apply', {
      code: 'LOYAL15',
      cart_total: 500,
      customer_id: 'cust-123',
    })
  })
})

describe('Error Handling for New APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle category creation error', async () => {
    const error = new Error('Duplicate category name')
    error.response = { status: 400, data: { detail: 'Category with this name already exists' } }

    mockPost.mockRejectedValueOnce(error)

    await expect(CategoriesAPI.create({ name: 'Existing' })).rejects.toThrow('Duplicate category name')
  })

  it('should handle customer not found error', async () => {
    const error = new Error('Not Found')
    error.response = { status: 404, data: { detail: 'Customer not found' } }

    mockGet.mockRejectedValueOnce(error)

    await expect(CustomersAPI.get('invalid-id')).rejects.toThrow('Not Found')
  })

  it('should handle invalid discount code error', async () => {
    const error = new Error('Not Found')
    error.response = { status: 404, data: { detail: 'Invalid discount code' } }

    mockPost.mockRejectedValueOnce(error)

    await expect(DiscountsAPI.apply('INVALID', 500)).rejects.toThrow('Not Found')
  })

  it('should handle discount minimum not met error', async () => {
    const error = new Error('Bad Request')
    error.response = { status: 400, data: { detail: 'Minimum purchase of R500 required' } }

    mockPost.mockRejectedValueOnce(error)

    await expect(DiscountsAPI.apply('BIGSPEND', 100)).rejects.toThrow('Bad Request')
  })
})
