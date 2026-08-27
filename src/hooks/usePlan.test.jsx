import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePlan } from './usePlan'
import { PlanAPI } from '../api/client'

vi.mock('../api/client', () => ({
  PlanAPI: { get: vi.fn() },
}))

const CACHE_KEY = 'kashpoint.plan.v1'

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const PRO = { plan: 'pro', status: 'active', is_active: true, is_on_trial: false }
const EXPIRED = { plan: 'expired', status: 'expired', is_active: false, is_on_trial: false }

describe('usePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('never locks features on a remembered "no" — only on a fresh one', async () => {
    // The cache outlives the fact it recorded. A store that was expired earlier
    // today and has since paid must not render locked on every load until the
    // request returns; that gap is the delay users complain about.
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...EXPIRED, cachedAt: 1 }))
    PlanAPI.get.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlan(), { wrapper })

    expect(result.current.isSubscribedOrTrial).toBe(true)
  })

  it('renders a remembered subscription immediately, with no request answered yet', () => {
    // The bug this exists to prevent: a paying customer refreshes and watches
    // Dashboard, Transactions, Customers and Team vanish until /plan returns.
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...PRO, cachedAt: 1 }))
    PlanAPI.get.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlan(), { wrapper })

    expect(result.current.isSubscribedOrTrial).toBe(true)
    expect(result.current.plan.plan).toBe('pro')
  })

  it('still refetches even though it rendered from cache', async () => {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...PRO, cachedAt: Date.now() }))
    PlanAPI.get.mockResolvedValue(EXPIRED)

    const { result } = renderHook(() => usePlan(), { wrapper })

    // A cancelled subscription must actually take effect, so the cached value
    // cannot be allowed to suppress the request.
    await waitFor(() => expect(result.current.isSubscribedOrTrial).toBe(false))
    expect(PlanAPI.get).toHaveBeenCalled()
  })

  it('keeps features unlocked when the server cannot be reached', async () => {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...EXPIRED, cachedAt: 1 }))
    PlanAPI.get.mockRejectedValue(new Error('Network Error'))

    const { result } = renderHook(() => usePlan(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.isSubscribedOrTrial).toBe(true)
  })

  it('does not overwrite a good cache with a failed response', async () => {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...PRO, cachedAt: 1 }))
    PlanAPI.get.mockRejectedValue(new Error('Network Error'))

    const { result } = renderHook(() => usePlan(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(JSON.parse(window.localStorage.getItem(CACHE_KEY)).plan).toBe('pro')
  })

  it('remembers the answer for the next load', async () => {
    PlanAPI.get.mockResolvedValue(PRO)
    const { result } = renderHook(() => usePlan(), { wrapper })
    await waitFor(() => expect(result.current.isSubscribedOrTrial).toBe(true))
    expect(JSON.parse(window.localStorage.getItem(CACHE_KEY)).plan).toBe('pro')
  })

  it('assumes entitled on a brand-new device rather than hiding paid features', () => {
    PlanAPI.get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.isSubscribedOrTrial).toBe(true)
  })

  it('locks features once the server says the store is expired', async () => {
    PlanAPI.get.mockResolvedValue(EXPIRED)
    const { result } = renderHook(() => usePlan(), { wrapper })
    await waitFor(() => expect(result.current.isSubscribedOrTrial).toBe(false))
  })

  it('treats a trial as entitled', async () => {
    PlanAPI.get.mockResolvedValue({ ...EXPIRED, is_on_trial: true })
    const { result } = renderHook(() => usePlan(), { wrapper })
    await waitFor(() => expect(result.current.isSubscribedOrTrial).toBe(true))
  })

  it('ignores a corrupt cache instead of crashing', () => {
    window.localStorage.setItem(CACHE_KEY, '{not json')
    PlanAPI.get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.plan).toBeUndefined()
    expect(result.current.isSubscribedOrTrial).toBe(true)
  })
})
