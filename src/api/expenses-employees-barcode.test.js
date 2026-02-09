import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks that need to be available before module import
const { mockGet, mockPost, mockPut, mockDelete } = vi.hoisted(() => {
  return {
    mockGet: vi.fn(),
    mockPost: vi.fn(),
    mockPut: vi.fn(),
    mockDelete: vi.fn(),
  }
})

vi.mock('axios', () => {
  const mockAxiosInstance = {
    create: vi.fn(() => mockAxiosInstance),
    get: mockGet,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return { default: mockAxiosInstance }
})

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

describe('Expenses, Employees, and Barcode APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
    mockDelete.mockReset()
  })

  // ============================================
  // EXPENSES API TESTS
  // ============================================
  describe('ExpensesAPI', () => {
    it('should list expenses', async () => {
      const mockExpenses = [
        { id: 'exp-1', category: 'Rent', amount: 5000 },
        { id: 'exp-2', category: 'Utilities', amount: 500 },
      ]
      mockGet.mockResolvedValueOnce({ data: mockExpenses })

      const { ExpensesAPI } = await import('./client.js')
      const result = await ExpensesAPI.list()

      expect(result).toEqual(mockExpenses)
      expect(mockGet).toHaveBeenCalledWith('/expenses', { params: {} })
    })

    it('should list expenses with date filter', async () => {
      mockGet.mockResolvedValueOnce({ data: [] })

      const { ExpensesAPI } = await import('./client.js')
      await ExpensesAPI.list({ start_date: '2026-02-01', end_date: '2026-02-28' })

      expect(mockGet).toHaveBeenCalledWith('/expenses', {
        params: { start_date: '2026-02-01', end_date: '2026-02-28' },
      })
    })

    it('should create an expense', async () => {
      const newExpense = {
        category: 'Rent',
        amount: 5000,
        expense_date: '2026-02-01',
      }
      const createdExpense = { id: 'exp-1', ...newExpense }
      mockPost.mockResolvedValueOnce({ data: createdExpense })

      const { ExpensesAPI } = await import('./client.js')
      const result = await ExpensesAPI.create(newExpense)

      expect(result).toEqual(createdExpense)
      expect(mockPost).toHaveBeenCalledWith('/expenses', newExpense)
    })

    it('should update an expense', async () => {
      const updatedExpense = { id: 'exp-1', amount: 5500 }
      mockPut.mockResolvedValueOnce({ data: updatedExpense })

      const { ExpensesAPI } = await import('./client.js')
      const result = await ExpensesAPI.update('exp-1', { amount: 5500 })

      expect(result).toEqual(updatedExpense)
      expect(mockPut).toHaveBeenCalledWith('/expenses/exp-1', { amount: 5500 })
    })

    it('should delete an expense', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })

      const { ExpensesAPI } = await import('./client.js')
      await ExpensesAPI.remove('exp-1')

      expect(mockDelete).toHaveBeenCalledWith('/expenses/exp-1')
    })

    it('should get expense categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Rent', icon: 'home' },
        { id: 'cat-2', name: 'Utilities', icon: 'zap' },
      ]
      mockGet.mockResolvedValueOnce({ data: mockCategories })

      const { ExpensesAPI } = await import('./client.js')
      const result = await ExpensesAPI.getCategories()

      expect(result).toEqual(mockCategories)
      expect(mockGet).toHaveBeenCalledWith('/expense-categories')
    })

    it('should get expense summary', async () => {
      const mockSummary = {
        total_expenses: 5500,
        expense_count: 2,
        category_breakdown: [{ category: 'Rent', amount: 5000 }],
      }
      mockGet.mockResolvedValueOnce({ data: mockSummary })

      const { ExpensesAPI } = await import('./client.js')
      const result = await ExpensesAPI.getSummary('2026-02-01', '2026-02-28')

      expect(result.total_expenses).toBe(5500)
      expect(mockGet).toHaveBeenCalledWith('/expenses/summary', {
        params: { start_date: '2026-02-01', end_date: '2026-02-28' },
      })
    })
  })

  // ============================================
  // SHIFTS API TESTS
  // ============================================
  describe('ShiftsAPI', () => {
    it('should list shifts', async () => {
      const mockShifts = [
        { id: 'shift-1', user_id: 'user-1', shift_date: '2026-02-09' },
      ]
      mockGet.mockResolvedValueOnce({ data: mockShifts })

      const { ShiftsAPI } = await import('./client.js')
      const result = await ShiftsAPI.list()

      expect(result).toEqual(mockShifts)
      expect(mockGet).toHaveBeenCalledWith('/shifts', { params: {} })
    })

    it('should create a shift', async () => {
      const newShift = {
        user_id: 'user-1',
        shift_date: '2026-02-10',
        scheduled_start: '09:00',
        scheduled_end: '17:00',
      }
      const createdShift = { id: 'shift-1', ...newShift }
      mockPost.mockResolvedValueOnce({ data: createdShift })

      const { ShiftsAPI } = await import('./client.js')
      const result = await ShiftsAPI.create(newShift)

      expect(result).toEqual(createdShift)
      expect(mockPost).toHaveBeenCalledWith('/shifts', newShift)
    })

    it('should update a shift', async () => {
      const updatedShift = { id: 'shift-1', status: 'completed' }
      mockPut.mockResolvedValueOnce({ data: updatedShift })

      const { ShiftsAPI } = await import('./client.js')
      const result = await ShiftsAPI.update('shift-1', { status: 'completed' })

      expect(result).toEqual(updatedShift)
      expect(mockPut).toHaveBeenCalledWith('/shifts/shift-1', { status: 'completed' })
    })

    it('should delete a shift', async () => {
      mockDelete.mockResolvedValueOnce({ data: null })

      const { ShiftsAPI } = await import('./client.js')
      await ShiftsAPI.remove('shift-1')

      expect(mockDelete).toHaveBeenCalledWith('/shifts/shift-1')
    })
  })

  // ============================================
  // TIME CLOCK API TESTS
  // ============================================
  describe('TimeClockAPI', () => {
    it('should list time entries', async () => {
      const mockEntries = [
        { id: 'entry-1', clock_in: '2026-02-09T09:00:00Z', clock_out: '2026-02-09T17:00:00Z' },
      ]
      mockGet.mockResolvedValueOnce({ data: mockEntries })

      const { TimeClockAPI } = await import('./client.js')
      const result = await TimeClockAPI.list()

      expect(result).toEqual(mockEntries)
      expect(mockGet).toHaveBeenCalledWith('/time-clock', { params: {} })
    })

    it('should clock in', async () => {
      const mockEntry = { id: 'entry-1', clock_in: '2026-02-09T09:00:00Z' }
      mockPost.mockResolvedValueOnce({ data: mockEntry })

      const { TimeClockAPI } = await import('./client.js')
      const result = await TimeClockAPI.clockIn()

      expect(result.clock_in).toBeDefined()
      expect(mockPost).toHaveBeenCalledWith('/time-clock/clock-in', {})
    })

    it('should clock out', async () => {
      const mockEntry = {
        id: 'entry-1',
        clock_in: '2026-02-09T09:00:00Z',
        clock_out: '2026-02-09T17:00:00Z',
        total_hours: 8.0,
      }
      mockPost.mockResolvedValueOnce({ data: mockEntry })

      const { TimeClockAPI } = await import('./client.js')
      const result = await TimeClockAPI.clockOut()

      expect(result.clock_out).toBeDefined()
      expect(result.total_hours).toBe(8.0)
      expect(mockPost).toHaveBeenCalledWith('/time-clock/clock-out', {})
    })

    it('should get current clock status', async () => {
      const mockStatus = { clocked_in: true, entry: { id: 'entry-1' } }
      mockGet.mockResolvedValueOnce({ data: mockStatus })

      const { TimeClockAPI } = await import('./client.js')
      const result = await TimeClockAPI.getCurrentStatus()

      expect(result.clocked_in).toBe(true)
      expect(mockGet).toHaveBeenCalledWith('/time-clock/current')
    })
  })

  // ============================================
  // COMMISSIONS API TESTS
  // ============================================
  describe('CommissionsAPI', () => {
    it('should list commissions', async () => {
      const mockCommissions = [
        { id: 'comm-1', user_id: 'user-1', commission_amount: 50 },
      ]
      mockGet.mockResolvedValueOnce({ data: mockCommissions })

      const { CommissionsAPI } = await import('./client.js')
      const result = await CommissionsAPI.list()

      expect(result).toEqual(mockCommissions)
      expect(mockGet).toHaveBeenCalledWith('/commissions', { params: {} })
    })

    it('should approve a commission', async () => {
      const mockCommission = { id: 'comm-1', status: 'approved' }
      mockPost.mockResolvedValueOnce({ data: mockCommission })

      const { CommissionsAPI } = await import('./client.js')
      const result = await CommissionsAPI.approve('comm-1')

      expect(result.status).toBe('approved')
      expect(mockPost).toHaveBeenCalledWith('/commissions/comm-1/approve')
    })

    it('should mark commission as paid', async () => {
      const mockCommission = { id: 'comm-1', status: 'paid' }
      mockPost.mockResolvedValueOnce({ data: mockCommission })

      const { CommissionsAPI } = await import('./client.js')
      const result = await CommissionsAPI.markPaid('comm-1')

      expect(result.status).toBe('paid')
      expect(mockPost).toHaveBeenCalledWith('/commissions/comm-1/pay')
    })
  })

  // ============================================
  // BARCODE API TESTS
  // ============================================
  describe('BarcodeAPI', () => {
    it('should generate a barcode', async () => {
      const mockBarcode = {
        product_id: 1,
        barcode: 'STORE123-000001',
        barcode_type: 'CODE128',
        barcode_image: 'data:image/png;base64,ABC123',
      }
      mockPost.mockResolvedValueOnce({ data: mockBarcode })

      const { BarcodeAPI } = await import('./client.js')
      const result = await BarcodeAPI.generate(1, 'CODE128')

      expect(result.barcode).toBeDefined()
      expect(result.barcode_image).toContain('data:image')
      expect(mockPost).toHaveBeenCalledWith('/products/1/barcode', {
        product_id: 1,
        barcode_type: 'CODE128',
      })
    })

    it('should lookup a barcode', async () => {
      const mockProduct = {
        product_id: 1,
        name: 'Test Product',
        price: 100,
        quantity: 50,
        barcode: 'TEST-000001',
      }
      mockGet.mockResolvedValueOnce({ data: mockProduct })

      const { BarcodeAPI } = await import('./client.js')
      const result = await BarcodeAPI.lookup('TEST-000001')

      expect(result.name).toBe('Test Product')
      expect(result.price).toBe(100)
      expect(mockGet).toHaveBeenCalledWith('/barcode/lookup/TEST-000001')
    })
  })

  // ============================================
  // ENHANCED REPORTS API TESTS
  // ============================================
  describe('EnhancedReportsAPI', () => {
    it('should get profit/loss report', async () => {
      const mockReport = {
        period_start: '2026-02-01',
        period_end: '2026-02-28',
        total_revenue: 10000,
        gross_profit: 4000,
        total_expenses: 2000,
        net_profit: 2000,
      }
      mockGet.mockResolvedValueOnce({ data: mockReport })

      const { EnhancedReportsAPI } = await import('./client.js')
      const result = await EnhancedReportsAPI.getProfitLoss('2026-02-01', '2026-02-28')

      expect(result.total_revenue).toBe(10000)
      expect(result.net_profit).toBe(2000)
      expect(mockGet).toHaveBeenCalledWith('/reports/profit-loss', {
        params: { start_date: '2026-02-01', end_date: '2026-02-28' },
      })
    })

    it('should get employee sales report', async () => {
      const mockReport = [
        {
          user_id: 'user-1',
          user_name: 'John Doe',
          total_sales: 50,
          total_revenue: 5000,
          commission_earned: 250,
        },
      ]
      mockGet.mockResolvedValueOnce({ data: mockReport })

      const { EnhancedReportsAPI } = await import('./client.js')
      const result = await EnhancedReportsAPI.getEmployeeSales('2026-02-01', '2026-02-28')

      expect(result).toHaveLength(1)
      expect(result[0].total_revenue).toBe(5000)
      expect(mockGet).toHaveBeenCalledWith('/reports/employee-sales', {
        params: { start_date: '2026-02-01', end_date: '2026-02-28' },
      })
    })

    it('should get tax report', async () => {
      const mockReport = {
        period_start: '2026-02-01',
        period_end: '2026-02-28',
        total_sales: 11500,
        tax_collected: 1500,
        tax_rate: 15.0,
        taxable_sales: 10000,
        transactions_count: 100,
      }
      mockGet.mockResolvedValueOnce({ data: mockReport })

      const { EnhancedReportsAPI } = await import('./client.js')
      const result = await EnhancedReportsAPI.getTax('2026-02-01', '2026-02-28', 15)

      expect(result.tax_collected).toBe(1500)
      expect(result.tax_rate).toBe(15.0)
      expect(mockGet).toHaveBeenCalledWith('/reports/tax', {
        params: { start_date: '2026-02-01', end_date: '2026-02-28', tax_rate: 15 },
      })
    })

    it('should get inventory valuation report', async () => {
      const mockReport = {
        total_products: 100,
        total_quantity: 5000,
        total_cost_value: 250000,
        total_retail_value: 500000,
        potential_profit: 250000,
        low_stock_count: 10,
        out_of_stock_count: 5,
      }
      mockGet.mockResolvedValueOnce({ data: mockReport })

      const { EnhancedReportsAPI } = await import('./client.js')
      const result = await EnhancedReportsAPI.getInventoryValuation(10)

      expect(result.total_products).toBe(100)
      expect(result.potential_profit).toBe(250000)
      expect(mockGet).toHaveBeenCalledWith('/reports/inventory-valuation', {
        params: { low_stock_threshold: 10 },
      })
    })

    it('should export profit/loss CSV', async () => {
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })
      mockGet.mockResolvedValueOnce({ data: mockBlob })

      const { EnhancedReportsAPI } = await import('./client.js')
      const result = await EnhancedReportsAPI.exportProfitLossCSV('2026-02-01', '2026-02-28')

      expect(result).toBeInstanceOf(Blob)
      expect(mockGet).toHaveBeenCalledWith('/reports/export/profit-loss', {
        params: { start_date: '2026-02-01', end_date: '2026-02-28' },
        responseType: 'blob',
      })
    })
  })
})
