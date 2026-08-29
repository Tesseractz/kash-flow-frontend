import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// This page shipped broken once with the whole test suite green: a refactor
// left `tableSection` defined in the wrong component's scope, nothing rendered
// the page in tests, and the build cannot catch an undefined identifier. This
// smoke test exists so the page is actually mounted on every run.

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    SalesAPI: { list: vi.fn() },
    ProductsAPI: { list: vi.fn() },
    CustomersAPI: { list: vi.fn() },
    UsersAPI: { list: vi.fn() },
    PlanAPI: { get: vi.fn() },
  },
}))

vi.mock('../api/client', () => apiMock)

// Field names as the API actually returns them (see enrichTransactions):
// quantity_sold / total_price / timestamp — not quantity / total / created_at.
const SALE = {
  id: 109,
  product_id: 16,
  quantity_sold: 1,
  total_price: 500,
  profit: 80.02,
  payment_method: 'cash',
  timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
}

const renderPage = async () => {
  const { default: Transactions } = await import('./Transactions')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={['/transactions']}>
      <QueryClientProvider client={client}>
        <Transactions />
      </QueryClientProvider>
    </MemoryRouter>
  )
}

describe('Transactions page smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMock.SalesAPI.list.mockResolvedValue([SALE])
    apiMock.ProductsAPI.list.mockResolvedValue({
      items: [{ id: 16, name: 'Power Bank 10000mAh', sku: 'PRD-001', price: 500, cost_price: 419.98, quantity: 9 }],
      total: 1,
    })
    apiMock.CustomersAPI.list.mockResolvedValue([])
    apiMock.UsersAPI.list.mockResolvedValue([])
    apiMock.PlanAPI.get.mockResolvedValue({ plan: 'pro', is_active: true, limits: {}, usage: {} })
  })

  it('renders without throwing and shows the sale row', async () => {
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Power Bank 10000mAh')).toBeInTheDocument()
    })
  })

  it('enters and leaves full-screen view', async () => {
    await renderPage()
    await waitFor(() => screen.getByText('Power Bank 10000mAh'))

    fireEvent.click(screen.getByTitle('Full screen (table)'))
    expect(screen.getByRole('dialog', { name: 'Transactions' })).toBeInTheDocument()
    // The table itself must have come along into the overlay.
    expect(screen.getByText('Power Bank 10000mAh')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Transactions' })).not.toBeInTheDocument()
    })
    expect(screen.getByText('Power Bank 10000mAh')).toBeInTheDocument()
  })
})
