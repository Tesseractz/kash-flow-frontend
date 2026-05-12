import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isNativePushSupported, enrollNativePush } from './nativePush'

// Mock the API client so enrollNativePush doesn't try to hit the backend.
vi.mock('../api/client', () => ({
  PushAPI: {
    fcmSubscribe: vi.fn().mockResolvedValue({ success: true }),
  },
}))

import { PushAPI } from '../api/client'

describe('isNativePushSupported', () => {
  const savedCapacitor = window.Capacitor

  afterEach(() => {
    if (savedCapacitor) {
      window.Capacitor = savedCapacitor
    } else {
      delete window.Capacitor
    }
  })

  it('is false when not on Capacitor', () => {
    delete window.Capacitor
    expect(isNativePushSupported()).toBe(false)
  })

  it('is false on Capacitor when the PushNotifications plugin is missing', () => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: {} }
    expect(isNativePushSupported()).toBe(false)
  })

  it('is true on Capacitor when the plugin is present', () => {
    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: { PushNotifications: {} },
    }
    expect(isNativePushSupported()).toBe(true)
  })
})

describe('enrollNativePush', () => {
  const savedCapacitor = window.Capacitor

  beforeEach(() => {
    PushAPI.fcmSubscribe.mockClear()
  })

  afterEach(() => {
    if (savedCapacitor) {
      window.Capacitor = savedCapacitor
    } else {
      delete window.Capacitor
    }
  })

  function withPlugin({
    requestPermissions = vi.fn().mockResolvedValue({ receive: 'granted' }),
    register = vi.fn().mockResolvedValue(undefined),
    getPlatform = () => 'android',
  } = {}) {
    const listeners = {}
    const addListener = vi.fn().mockImplementation((event, cb) => {
      listeners[event] = cb
      return Promise.resolve({ remove: vi.fn() })
    })
    const PushNotifications = { requestPermissions, register, addListener }

    window.Capacitor = {
      isNativePlatform: () => true,
      getPlatform,
      Plugins: { PushNotifications },
    }
    return { PushNotifications, listeners, addListener }
  }

  it('throws when the Capacitor plugin is not installed', async () => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: {} }
    await expect(enrollNativePush()).rejects.toThrow(/plugin not installed/i)
  })

  it('throws when the user denies notification permission', async () => {
    withPlugin({
      requestPermissions: vi.fn().mockResolvedValue({ receive: 'denied' }),
    })
    await expect(enrollNativePush()).rejects.toThrow(/not granted/i)
  })

  it('registers, POSTs the token to the backend, and resolves with the token value', async () => {
    const { listeners, addListener } = withPlugin({ getPlatform: () => 'android' })

    const promise = enrollNativePush()

    // Wait one microtask so addListener has registered the callbacks.
    await Promise.resolve()
    await Promise.resolve()

    expect(addListener).toHaveBeenCalledWith('registration', expect.any(Function))
    expect(addListener).toHaveBeenCalledWith('registrationError', expect.any(Function))

    // Simulate FCM returning a token.
    await listeners.registration({ value: 'fcm-token-xyz' })

    await expect(promise).resolves.toBe('fcm-token-xyz')

    expect(PushAPI.fcmSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'fcm-token-xyz',
        platform: 'android',
      }),
    )
  })

  it('rejects when the plugin emits registrationError', async () => {
    const { listeners } = withPlugin()
    const promise = enrollNativePush()

    await Promise.resolve()
    await Promise.resolve()

    listeners.registrationError({ error: 'SERVICE_NOT_AVAILABLE' })

    await expect(promise).rejects.toThrow(/SERVICE_NOT_AVAILABLE/)
  })

  it('detects iOS platform when Capacitor.getPlatform returns "ios"', async () => {
    const { listeners } = withPlugin({ getPlatform: () => 'ios' })
    const promise = enrollNativePush()
    await Promise.resolve()
    await Promise.resolve()
    await listeners.registration({ value: 'apns-token-xyz' })
    await promise
    expect(PushAPI.fcmSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'ios' }),
    )
  })
})
