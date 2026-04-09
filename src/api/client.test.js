/**
 * Unit tests for API client
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mock functions before vi.mock hoisting
const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
}))

// Mock supabase first
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

// Mock axios - the mock is hoisted but uses the functions defined via vi.hoisted
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

// Import after mocks are set up
import { 
  ProductsAPI, 
  SalesAPI, 
  ReturnsAPI,
  ReportsAPI, 
  BillingAPI, 
  PlanAPI, 
  UsersAPI, 
  AlertsAPI, 
  AnalyticsAPI, 
  AuditAPI,
  NotificationsAPI,
  ProfileAPI
} from './client.js'

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ProductsAPI', () => {
    it('should list products', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100, quantity: 10 },
        { id: 2, name: 'Product 2', price: 200, quantity: 20 },
      ]
      
      mockGet.mockResolvedValueOnce({
        data: mockProducts,
        headers: { 'x-total-count': '2' },
      })

      const result = await ProductsAPI.list()

      expect(result.items).toEqual(mockProducts)
      expect(result.total).toBe(2)
    })

    it('should create a product', async () => {
      const newProduct = { name: 'New Product', price: 150, quantity: 25 }
      const createdProduct = { id: 1, ...newProduct }

      mockPost.mockResolvedValueOnce({ data: createdProduct })

      const result = await ProductsAPI.create(newProduct)

      expect(result).toEqual(createdProduct)
    })

    it('should update a product', async () => {
      const updatedProduct = { id: 1, name: 'Updated Product', price: 175, quantity: 30 }

      mockPut.mockResolvedValueOnce({ data: updatedProduct })

      const result = await ProductsAPI.update(1, { name: 'Updated Product', price: 175 })

      expect(result).toEqual(updatedProduct)
    })

    it('should delete a product', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })

      await ProductsAPI.remove(1)

      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('SalesAPI', () => {
    it('should list sales', async () => {
      const mockSales = [
        { id: 1, product_id: 1, quantity_sold: 2, total_price: 200 },
        { id: 2, product_id: 2, quantity_sold: 1, total_price: 150 },
      ]

      mockGet.mockResolvedValueOnce({ data: mockSales })

      const result = await SalesAPI.list()

      expect(result).toEqual(mockSales)
    })

    it('should create a sale', async () => {
      const newSale = { product_id: 1, quantity_sold: 3 }
      const createdSale = { id: 1, ...newSale, total_price: 300 }

      mockPost.mockResolvedValueOnce({ data: createdSale })

      const result = await SalesAPI.create(newSale)

      expect(result).toEqual(createdSale)
    })
  })

  describe('ReturnsAPI', () => {
    it('should create a return', async () => {
      const returnData = { product_id: 1, quantity_returned: 2 }
      const createdReturn = {
        id: 1,
        product_id: 1,
        quantity_sold: -2,
        total_price: -200,
      }

      mockPost.mockResolvedValueOnce({ data: createdReturn })

      const result = await ReturnsAPI.create(returnData)

      expect(result).toEqual(createdReturn)
    })
  })

  describe('ReportsAPI', () => {
    it('should get daily report', async () => {
      const mockReport = {
        totals: { total_revenue: 1000, total_profit: 400, total_sales_count: 10 },
        transactions: [],
      }

      mockGet.mockResolvedValueOnce({ data: mockReport })

      const result = await ReportsAPI.get('2026-02-09')

      expect(result).toEqual(mockReport)
    })

    it('should export CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })

      mockGet.mockResolvedValueOnce({ data: mockBlob })

      const result = await ReportsAPI.exportCSV('2026-02-09')

      expect(result).toBeInstanceOf(Blob)
    })
  })

  describe('BillingAPI', () => {
    it('should create checkout session', async () => {
      const mockResponse = { url: 'https://checkout.paystack.com/test123' }

      mockPost.mockResolvedValueOnce({ data: mockResponse })

      const result = await BillingAPI.checkout({ plan: 'pro', email: 'test@example.com' })

      expect(result).toEqual(mockResponse)
      expect(result.url).toBe('https://checkout.paystack.com/test123')
    })

    it('should get billing config', async () => {
      const mockConfig = {
        provider: 'paystack',
        paystack: {
          public_key: 'pk_test_123',
          plan_code: 'PLN_test',
          currency: 'ZAR',
        },
      }

      mockGet.mockResolvedValueOnce({ data: mockConfig })

      const result = await BillingAPI.config()

      expect(result.provider).toBe('paystack')
      expect(result.paystack).toBeDefined()
    })
  })

  describe('PlanAPI', () => {
    it('should get current plan', async () => {
      const mockPlan = {
        plan: 'pro',
        status: 'active',
        is_active: true,
        is_on_trial: false,
        limits: {
          max_products: null,
          max_users: 3,
          csv_export: true,
        },
      }

      mockGet.mockResolvedValueOnce({ data: mockPlan })

      const result = await PlanAPI.get()

      expect(result.plan).toBe('pro')
      expect(result.is_active).toBe(true)
    })
  })

  describe('ProfileAPI', () => {
    it('should get profile', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'admin@store.local',
        name: 'Admin User',
        role: 'admin',
      }

      mockGet.mockResolvedValueOnce({ data: mockProfile })

      const result = await ProfileAPI.get()

      expect(result.email).toBe('admin@store.local')
      expect(result.role).toBe('admin')
    })
  })

  describe('UsersAPI', () => {
    it('should list users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'admin@store.local', name: 'Admin', role: 'admin' },
        { id: 'user-2', email: 'cashier@store.local', name: 'Cashier', role: 'cashier' },
      ]

      mockGet.mockResolvedValueOnce({ data: mockUsers })

      const result = await UsersAPI.list()

      expect(result).toHaveLength(2)
    })

    it('should invite a user', async () => {
      const inviteData = { role: 'cashier' }
      const createdUser = {
        id: 'user-3',
        email: 'cashier1@store.local',
        name: 'cashier1',
        role: 'cashier',
        password: 'generatedPass123',
        login_username: 'cashier1@store.local',
      }

      mockPost.mockResolvedValueOnce({ data: createdUser })

      const result = await UsersAPI.invite(inviteData)

      expect(result.password).toBe('generatedPass123')
      expect(result.login_username).toBe('cashier1@store.local')
    })

    it('should update user role', async () => {
      const updatedUser = { id: 'user-2', role: 'admin' }

      mockPut.mockResolvedValueOnce({ data: updatedUser })

      const result = await UsersAPI.updateRole('user-2', 'admin')

      expect(result.role).toBe('admin')
    })

    it('should get user credentials', async () => {
      const credentials = {
        id: 'user-2',
        email: 'cashier@store.local',
        login_username: 'cashier@store.local',
        password: 'storedPassword123',
      }

      mockGet.mockResolvedValueOnce({ data: credentials })

      const result = await UsersAPI.getCredentials('user-2')

      expect(result.password).toBe('storedPassword123')
    })

    it('should remove a user', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })

      await UsersAPI.remove('user-2')

      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('AlertsAPI', () => {
    it('should get low stock alerts', async () => {
      const mockAlerts = [
        { id: 1, name: 'Low Stock Product', quantity: 5, threshold: 10 },
      ]

      mockGet.mockResolvedValueOnce({ data: mockAlerts })

      const result = await AlertsAPI.getLowStock(10)

      expect(result).toHaveLength(1)
      expect(result[0].quantity).toBeLessThan(result[0].threshold)
    })
  })

  describe('AnalyticsAPI', () => {
    it('should get analytics data', async () => {
      const mockAnalytics = {
        period_days: 30,
        total_revenue: 5000,
        total_profit: 2000,
        total_sales: 50,
        avg_transaction_value: 100,
        profit_margin: 40,
        sales_trends: [],
        top_products: [],
        hourly_breakdown: [],
      }

      mockGet.mockResolvedValueOnce({ data: mockAnalytics })

      const result = await AnalyticsAPI.get(30)

      expect(result.total_revenue).toBe(5000)
      expect(result.total_profit).toBe(2000)
    })
  })

  describe('AuditAPI', () => {
    it('should list audit logs', async () => {
      const mockLogs = [
        { id: 1, user_id: 'user-1', action: 'create', resource_type: 'product' },
        { id: 2, user_id: 'user-1', action: 'update', resource_type: 'product' },
      ]

      mockGet.mockResolvedValueOnce({ data: mockLogs })

      const result = await AuditAPI.list(50)

      expect(result).toHaveLength(2)
    })
  })

  describe('NotificationsAPI', () => {
    it('should get notification status', async () => {
      const mockStatus = {
        configured: true,
        sender_email: 'notifications@store.com',
      }

      mockGet.mockResolvedValueOnce({ data: mockStatus })

      const result = await NotificationsAPI.status()

      expect(result.configured).toBe(true)
    })

    it('should get notification settings', async () => {
      const mockSettings = {
        email_enabled: true,
        low_stock_threshold: 10,
      }

      mockGet.mockResolvedValueOnce({ data: mockSettings })

      const result = await NotificationsAPI.getSettings()

      expect(result.email_enabled).toBe(true)
    })

    it('should update notification settings', async () => {
      const newSettings = { email_enabled: false }
      const updatedSettings = { email_enabled: false, low_stock_threshold: 10 }

      mockPut.mockResolvedValueOnce({ data: updatedSettings })

      const result = await NotificationsAPI.updateSettings(newSettings)

      expect(result.email_enabled).toBe(false)
    })

    it('should send receipt', async () => {
      const receiptData = { sale_id: 1, customer_email: 'customer@example.com' }
      const mockResult = { success: true }

      mockPost.mockResolvedValueOnce({ data: mockResult })

      const result = await NotificationsAPI.sendReceipt(receiptData)

      expect(result.success).toBe(true)
    })
  })
})

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle API errors gracefully', async () => {
    const error = new Error('Network Error')
    error.response = { status: 500, data: { detail: 'Internal Server Error' } }

    mockGet.mockRejectedValueOnce(error)

    await expect(ProductsAPI.list()).rejects.toThrow('Network Error')
  })

  it('should handle 401 unauthorized errors', async () => {
    const error = new Error('Unauthorized')
    error.response = { status: 401, data: { detail: 'Invalid token' } }

    mockGet.mockRejectedValueOnce(error)

    await expect(ProductsAPI.list()).rejects.toThrow('Unauthorized')
  })

  it('should handle 403 forbidden errors', async () => {
    const error = new Error('Forbidden')
    error.response = { status: 403, data: { detail: 'Admins only' } }

    mockPost.mockRejectedValueOnce(error)

    await expect(ProductsAPI.create({ name: 'Test' })).rejects.toThrow('Forbidden')
  })

  it('should handle 402 payment required errors', async () => {
    const error = new Error('Payment Required')
    error.response = { status: 402, data: { detail: 'Upgrade required' } }

    mockGet.mockRejectedValueOnce(error)

    await expect(AlertsAPI.getLowStock()).rejects.toThrow('Payment Required')
  })
})
