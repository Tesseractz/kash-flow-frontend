/**
 * Unit tests for Customers API
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

import { CustomersAPI } from './client.js'

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

describe('Error Handling for New APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle customer not found error', async () => {
    const error = new Error('Not Found')
    error.response = { status: 404, data: { detail: 'Customer not found' } }

    mockGet.mockRejectedValueOnce(error)

    await expect(CustomersAPI.get('invalid-id')).rejects.toThrow('Not Found')
  })

})
