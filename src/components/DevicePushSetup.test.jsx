import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import DevicePushSetup from './DevicePushSetup'

const subscribeMock = vi.fn()
const testMock = vi.fn()

vi.mock('../api/client', () => ({
  PushAPI: {
    subscribe: (...args) => subscribeMock(...args),
    test: (...args) => testMock(...args),
  },
}))

const ensurePushSubscriptionMock = vi.fn()
const subscriptionToPayloadMock = vi.fn()

vi.mock('../lib/push', () => ({
  ensurePushSubscription: (...args) => ensurePushSubscriptionMock(...args),
  subscriptionToPayload: (...args) => subscriptionToPayloadMock(...args),
}))

describe('DevicePushSetup', () => {
  beforeEach(() => {
    subscribeMock.mockReset()
    testMock.mockReset()
    ensurePushSubscriptionMock.mockReset()
    subscriptionToPayloadMock.mockReset()
  })

  it('renders nothing when not enabled', () => {
    const { container } = render(<DevicePushSetup enabled={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('requests subscription only on button click', async () => {
    // minimal browser support
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true })
    Object.defineProperty(window, 'PushManager', { value: function PushManager() {}, configurable: true })

    // permission state used for label only
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default' },
      configurable: true,
    })

    ensurePushSubscriptionMock.mockResolvedValue({ toJSON: () => ({ endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } }) })
    subscriptionToPayloadMock.mockReturnValue({ endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } })
    subscribeMock.mockResolvedValue({ success: true })
    testMock.mockResolvedValue({ sent: 1 })

    render(<DevicePushSetup enabled />)

    expect(ensurePushSubscriptionMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Enable notifications/i }))
    expect(ensurePushSubscriptionMock).toHaveBeenCalledTimes(1)
  })
})

