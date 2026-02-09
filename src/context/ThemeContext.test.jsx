/**
 * Unit tests for ThemeContext
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Test component that uses the theme context
function TestComponent() {
  const { theme, setTheme, isDark } = useTheme()
  
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="isDark">{isDark ? 'dark' : 'light'}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset matchMedia mock
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('provides default theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    // Default should be 'system' or similar
    const themeElement = screen.getByTestId('theme')
    expect(themeElement).toBeInTheDocument()
  })

  it('can set theme to dark', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    const darkButton = screen.getByRole('button', { name: /set dark/i })
    
    await act(async () => {
      fireEvent.click(darkButton)
    })
    
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('can set theme to light', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    const lightButton = screen.getByRole('button', { name: /set light/i })
    
    await act(async () => {
      fireEvent.click(lightButton)
    })
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('persists theme preference', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    const darkButton = screen.getByRole('button', { name: /set dark/i })
    
    await act(async () => {
      fireEvent.click(darkButton)
    })
    
    expect(localStorageMock.setItem).toHaveBeenCalled()
  })

  it('loads theme from localStorage', () => {
    localStorageMock.getItem.mockReturnValueOnce('dark')
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    )
    
    expect(localStorageMock.getItem).toHaveBeenCalled()
  })
})
