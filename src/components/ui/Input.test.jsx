/**
 * Unit tests for Input component
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from './Input'

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeInTheDocument()
  })

  it('handles text input', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} placeholder="Type here" />)
    
    const input = screen.getByPlaceholderText('Type here')
    fireEvent.change(input, { target: { value: 'Hello World' } })
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('Hello World')
  })

  it('can be disabled', () => {
    render(<Input disabled placeholder="Disabled input" />)
    
    const input = screen.getByPlaceholderText('Disabled input')
    expect(input).toBeDisabled()
  })

  it('renders different types', () => {
    const { rerender } = render(<Input type="text" placeholder="text" />)
    expect(screen.getByPlaceholderText('text')).toHaveAttribute('type', 'text')

    rerender(<Input type="password" placeholder="password" />)
    expect(screen.getByPlaceholderText('password')).toHaveAttribute('type', 'password')

    rerender(<Input type="email" placeholder="email" />)
    expect(screen.getByPlaceholderText('email')).toHaveAttribute('type', 'email')

    rerender(<Input type="number" placeholder="number" />)
    expect(screen.getByPlaceholderText('number')).toHaveAttribute('type', 'number')
  })

  it('applies custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />)
    
    const input = screen.getByPlaceholderText('Custom')
    expect(input).toHaveClass('custom-input')
  })

  it('handles focus and blur events', () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    
    render(
      <Input 
        onFocus={handleFocus} 
        onBlur={handleBlur} 
        placeholder="Focus test" 
      />
    )
    
    const input = screen.getByPlaceholderText('Focus test')
    
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('accepts a defaultValue', () => {
    render(<Input defaultValue="Initial value" placeholder="Default" />)
    
    const input = screen.getByPlaceholderText('Default')
    expect(input).toHaveValue('Initial value')
  })

  it('works with controlled value', () => {
    const { rerender } = render(<Input value="Controlled" onChange={() => {}} />)
    
    const input = screen.getByDisplayValue('Controlled')
    expect(input).toHaveValue('Controlled')
    
    rerender(<Input value="Updated" onChange={() => {}} />)
    expect(input).toHaveValue('Updated')
  })
})
