import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePlan } from './usePlan'
import { PlanAPI } from '../api/client'

vi.mock('../api/client', () => ({
  PlanAPI: { get: vi.fn() },
}))

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('usePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('does not report a subscriber as unsubscribed while /plan is in flight', () => {
    // The whole point: a slow answer must not look like "no subscription", or a
    // paying customer watches their Pro nav items disappear on every load.
    PlanAPI.get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.plan).toBeUndefined()
    expect(result.current.isSubscribedOrTrial).toBe(true)
  })

  it('reflects an active subscription and remembers it for the next load', async () => {
    PlanAPI.get.mockResolvedValue({ plan: 'pro', is_active: true, is_on_trial: false })
    const { result } = renderHook(() => usePlan(), { wrapper })
    await waitFor(() => expect(result.current.isSubscribedOrTrial).toBe(true))
    expect(window.localStorage.getItem('kashpoint.plan.entitled')).toBe('1')
  })

  it('treats a trial as entitled', async () => {
    PlanAPI.get.mockResolvedValue({ plan: 'pro', is_active: false, is_on_trial: true })
    const { result } = renderHook(() => usePlan(), { wrapper })
    await waitFor(() => expect(result.current.isSubscribedOrTrial).toBe(true))
  })

  it('locks features once the server actually says the store is expired', async () => {
    PlanAPI.get.mockResolvedValue({ plan: 'expired', is_active: false, is_on_trial: false })
    const { result } = renderHook(() => usePlan(), { wrapper })
    await waitFor(() => expect(result.current.isSubscribedOrTrial).toBe(false))
    expect(window.localStorage.getItem('kashpoint.plan.entitled')).toBe('0')
  })

  it('uses the remembered answer while loading instead of guessing', () => {
    window.localStorage.setItem('kashpoint.plan.entitled', '0')
    PlanAPI.get.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePlan(), { wrapper })
    expect(result.current.isSubscribedOrTrial).toBe(false)
  })
})
