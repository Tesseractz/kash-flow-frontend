import { describe, it, expect, beforeEach } from 'vitest'
import { readCachedProfile, writeCachedProfile, clearCachedProfile } from './profileCache'

const ADMIN = { id: 'u1', name: 'Owner', role: 'admin', store_id: 's1' }

describe('profileCache', () => {
  beforeEach(() => window.localStorage.clear())

  it('returns the profile it stored for the same user', () => {
    writeCachedProfile('u1', ADMIN)
    expect(readCachedProfile('u1')).toEqual(ADMIN)
  })

  it('never hands one user another user\'s role', () => {
    // The whole reason this is keyed by id: a cashier signing in on the owner's
    // browser must not inherit an admin navigation, even for a moment.
    writeCachedProfile('u1', ADMIN)
    expect(readCachedProfile('u2')).toBeNull()
  })

  it('returns null when nothing is stored', () => {
    expect(readCachedProfile('u1')).toBeNull()
  })

  it('returns null without a user id', () => {
    writeCachedProfile('u1', ADMIN)
    expect(readCachedProfile(undefined)).toBeNull()
    expect(readCachedProfile(null)).toBeNull()
  })

  it('ignores a corrupt entry instead of throwing', () => {
    window.localStorage.setItem('kashpoint.profile.v1', '{not json')
    expect(readCachedProfile('u1')).toBeNull()
  })

  it('ignores an entry with no usable role', () => {
    window.localStorage.setItem(
      'kashpoint.profile.v1',
      JSON.stringify({ userId: 'u1', profile: { name: 'x' } })
    )
    expect(readCachedProfile('u1')).toBeNull()
  })

  it('refuses to store a profile with no role', () => {
    writeCachedProfile('u1', { name: 'no role' })
    expect(readCachedProfile('u1')).toBeNull()
  })

  it('clears on sign-out so the next user starts clean', () => {
    writeCachedProfile('u1', ADMIN)
    clearCachedProfile()
    expect(readCachedProfile('u1')).toBeNull()
  })
})
