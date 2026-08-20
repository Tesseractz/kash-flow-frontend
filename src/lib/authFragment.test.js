import { describe, it, expect } from 'vitest'
import { parseAuthFragment } from './authFragment'

describe('parseAuthFragment', () => {
  it('recognises a password recovery link', () => {
    const r = parseAuthFragment(
      '#access_token=eyJhbG.abc&expires_in=3600&refresh_token=xyz&token_type=bearer&type=recovery'
    )
    expect(r.isRecovery).toBe(true)
    expect(r.isConfirmation).toBe(false)
    expect(r.error).toBeNull()
  })

  it('does not mistake an ordinary sign-in for a recovery', () => {
    // A recovery link creates a session exactly like a login does, so `type` is
    // the only thing separating "reset your password" from "you are logged in".
    expect(parseAuthFragment('#access_token=eyJhbG.abc&type=bearer').isRecovery).toBe(false)
    expect(parseAuthFragment('').isRecovery).toBe(false)
    expect(parseAuthFragment(undefined).isRecovery).toBe(false)
  })

  it('recognises email confirmation links', () => {
    expect(parseAuthFragment('#type=signup').isConfirmation).toBe(true)
    expect(parseAuthFragment('#type=email_change').isConfirmation).toBe(true)
  })

  it('reports an expired link with a readable description', () => {
    const r = parseAuthFragment(
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    )
    expect(r.error).toEqual({
      code: 'otp_expired',
      description: 'Email link is invalid or has expired',
    })
    expect(r.isRecovery).toBe(false)
  })

  it('falls back to `error` when no error_code is given', () => {
    expect(parseAuthFragment('#error=server_error').error.code).toBe('server_error')
  })
})
