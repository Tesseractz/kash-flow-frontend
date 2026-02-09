/**
 * Unit tests for useOnlineStatus hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus Hook', () => {
  let originalNavigator

  beforeEach(() => {
    // Save original navigator.onLine
    originalNavigator = window.navigator.onLine
  })

  afterEach(() => {
    // Restore navigator.onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: originalNavigator,
      writable: true,
    })
  })

  it('returns true when online', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    
    expect(result.current).toBe(true)
  })

  it('returns false when offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    
    expect(result.current).toBe(false)
  })

  it('updates when going offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      writable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    
    expect(result.current).toBe(true)

    // Simulate going offline
    await act(async () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: false,
        writable: true,
      })
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)
  })

  it('updates when coming online', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      writable: true,
    })

    const { result } = renderHook(() => useOnlineStatus())
    
    expect(result.current).toBe(false)

    // Simulate coming online
    await act(async () => {
      Object.defineProperty(window.navigator, 'onLine', {
        value: true,
        writable: true,
      })
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })

  it('cleans up event listeners on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useOnlineStatus())

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
})
