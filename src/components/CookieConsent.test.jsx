import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CookieConsent from './CookieConsent'

const saveCookiePreferencesMock = vi.fn()

vi.mock('../api/client', () => ({
  PrivacyAPI: {
    saveCookiePreferences: (...args) => saveCookiePreferencesMock(...args),
  },
}))

const useAuthMock = vi.fn()
vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

describe('CookieConsent', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    saveCookiePreferencesMock.mockReset()
    useAuthMock.mockReturnValue({ user: null })
    localStorage.clear()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('does not show immediately (delays 1s)', () => {
    render(<CookieConsent />)
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument()
  })

  it('shows banner after 1s when no consent stored', async () => {
    render(<CookieConsent />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(screen.getByRole('heading', { name: /We use cookies/i })).toBeInTheDocument()
  })

  it('does not show banner when consent exists in localStorage', () => {
    localStorage.setItem(
      'cookie_consent',
      JSON.stringify({ essential: true, analytics: false, marketing: false, functional: true })
    )
    render(<CookieConsent />)
    vi.advanceTimersByTime(1500)
    expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument()
  })

  it('accept all saves preferences and hides banner', async () => {
    render(<CookieConsent />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(screen.getByRole('heading', { name: /We use cookies/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Accept All/i }))

    expect(screen.queryByText(/We use cookies/i)).not.toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem('cookie_consent'))
    expect(stored).toEqual({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    })
  })

  it('reject all stores non-essential as false and hides banner', async () => {
    render(<CookieConsent />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    fireEvent.click(screen.getByRole('button', { name: /Reject All/i }))
    const stored = JSON.parse(localStorage.getItem('cookie_consent'))
    expect(stored).toEqual({
      essential: true,
      analytics: false,
      marketing: false,
      functional: true,
    })
  })

  it('syncs preferences to server when logged in', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } })

    render(<CookieConsent />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    fireEvent.click(screen.getByRole('button', { name: /Accept All/i }))

    expect(saveCookiePreferencesMock).toHaveBeenCalledTimes(1)
    expect(saveCookiePreferencesMock).toHaveBeenCalledWith({
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    })
  })
})

