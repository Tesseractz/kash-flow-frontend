import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isCapacitorNative,
  isElectron,
  isWebBrowser,
  openExternalUrl,
} from './platform'

describe('platform.js — runtime shell detection', () => {
  // Snapshot whatever globals we mutate so each test starts clean.
  const savedCapacitor = window.Capacitor
  const savedProcess = window.process
  const savedUA = navigator.userAgent

  beforeEach(() => {
    delete window.Capacitor
    delete window.process
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 jsdom',
      configurable: true,
    })
  })

  afterEach(() => {
    if (savedCapacitor) window.Capacitor = savedCapacitor
    if (savedProcess) window.process = savedProcess
    Object.defineProperty(navigator, 'userAgent', {
      value: savedUA,
      configurable: true,
    })
  })

  describe('isCapacitorNative', () => {
    it('returns false in a normal browser tab', () => {
      expect(isCapacitorNative()).toBe(false)
    })

    it('returns true when Capacitor.isNativePlatform() returns true', () => {
      window.Capacitor = { isNativePlatform: () => true }
      expect(isCapacitorNative()).toBe(true)
    })

    it('returns false when Capacitor.isNativePlatform() returns false (web preview)', () => {
      window.Capacitor = { isNativePlatform: () => false }
      expect(isCapacitorNative()).toBe(false)
    })

    it('falls back to the legacy isNative flag when isNativePlatform is missing', () => {
      window.Capacitor = { isNative: true }
      expect(isCapacitorNative()).toBe(true)
    })
  })

  describe('isElectron', () => {
    it('returns false in a normal browser tab', () => {
      expect(isElectron()).toBe(false)
    })

    it('returns true when userAgent contains "Electron"', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Electron/31.0)',
        configurable: true,
      })
      expect(isElectron()).toBe(true)
    })

    it('returns true when window.process.versions.electron is present', () => {
      window.process = { versions: { electron: '31.0.0' } }
      expect(isElectron()).toBe(true)
    })
  })

  describe('isWebBrowser', () => {
    it('is true when neither Capacitor nor Electron is detected', () => {
      expect(isWebBrowser()).toBe(true)
    })

    it('is false on Capacitor', () => {
      window.Capacitor = { isNativePlatform: () => true }
      expect(isWebBrowser()).toBe(false)
    })

    it('is false on Electron', () => {
      window.process = { versions: { electron: '31.0.0' } }
      expect(isWebBrowser()).toBe(false)
    })
  })
})

describe('openExternalUrl', () => {
  const savedCapacitor = window.Capacitor

  afterEach(() => {
    if (savedCapacitor) {
      window.Capacitor = savedCapacitor
    } else {
      delete window.Capacitor
    }
  })

  // We can't spy on window.location.assign in jsdom (it's non-configurable),
  // so the "same-window" tests only assert on the returned kind. The Capacitor
  // branch is fully observable because we control the Capacitor mock.

  it('returns kind=same-window on plain web (no Capacitor)', async () => {
    delete window.Capacitor

    const result = await openExternalUrl('https://example.com/checkout')

    expect(result.kind).toBe('same-window')
    expect(result.onClosed).toBeUndefined()
  })

  it('opens the in-app browser when Capacitor Browser plugin is available', async () => {
    const openMock = vi.fn().mockResolvedValue(undefined)
    const removeMock = vi.fn()
    let browserFinishedCb = null
    const addListenerMock = vi.fn().mockImplementation((event, cb) => {
      if (event === 'browserFinished') browserFinishedCb = cb
      return Promise.resolve({ remove: removeMock })
    })

    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        Browser: { open: openMock, addListener: addListenerMock },
      },
    }

    const result = await openExternalUrl('https://example.com/checkout')

    expect(result.kind).toBe('in-app-browser')
    expect(openMock).toHaveBeenCalledWith({ url: 'https://example.com/checkout' })
    expect(addListenerMock).toHaveBeenCalledWith('browserFinished', expect.any(Function))

    // onClosed should resolve once browserFinished fires.
    let resolved = false
    result.onClosed.then(() => {
      resolved = true
    })
    await new Promise((r) => setTimeout(r, 0))
    expect(resolved).toBe(false)

    browserFinishedCb()
    await result.onClosed
    expect(resolved).toBe(true)
    expect(removeMock).toHaveBeenCalled()
  })

  it('returns kind=same-window when on Capacitor but Browser plugin is missing', async () => {
    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {},
    }

    const result = await openExternalUrl('https://example.com/checkout')

    expect(result.kind).toBe('same-window')
    expect(result.onClosed).toBeUndefined()
  })

  it('resolves onClosed immediately if the listener API fails (older plugin)', async () => {
    const openMock = vi.fn().mockResolvedValue(undefined)
    const addListenerMock = vi.fn().mockRejectedValue(new Error('no listener API'))

    window.Capacitor = {
      isNativePlatform: () => true,
      Plugins: {
        Browser: { open: openMock, addListener: addListenerMock },
      },
    }

    const result = await openExternalUrl('https://example.com/checkout')
    expect(result.kind).toBe('in-app-browser')
    // Should not hang — falls back to a 0ms resolve when addListener throws.
    await expect(result.onClosed).resolves.toBeUndefined()
  })
})
