import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import DevicePushSetup from './DevicePushSetup'

const testMock = vi.fn()
const privacyUpdateMock = vi.fn()

let isPushSupportedValue = true
const enrollPushMock = vi.fn()

vi.mock('../api/client', () => ({
  PushAPI: {
    test: (...args) => testMock(...args),
  },
  PrivacyAPI: {
    updateSettings: (...args) => privacyUpdateMock(...args),
  },
}))

vi.mock('../lib/push', () => ({
  isPushSupported: () => isPushSupportedValue,
  enrollPushNotifications: (...args) => enrollPushMock(...args),
}))

function renderWithQuery(ui) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('DevicePushSetup', () => {
  beforeEach(() => {
    isPushSupportedValue = true
    testMock.mockReset()
    privacyUpdateMock.mockReset()
    enrollPushMock.mockReset()
    enrollPushMock.mockResolvedValue({})
    privacyUpdateMock.mockResolvedValue({})
    testMock.mockResolvedValue({ sent: 1 })
  })

  it('shows unsupported message when push is not available', () => {
    isPushSupportedValue = false
    const { container } = renderWithQuery(<DevicePushSetup />)
    expect(container.textContent).toMatch(/not available in this browser/i)
  })

  it('enrolls push only on button click', async () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    Object.defineProperty(window, 'PushManager', { value: function PushManager() {}, configurable: true })
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default' },
      configurable: true,
    })

    renderWithQuery(<DevicePushSetup />)

    expect(enrollPushMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Allow system notifications/i }))
    await waitFor(() => {
      expect(enrollPushMock).toHaveBeenCalledTimes(1)
    })
    expect(privacyUpdateMock).toHaveBeenCalledWith({ push_notifications_enabled: true })
  })
})
