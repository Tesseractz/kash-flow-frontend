import { describe, it, expect } from 'vitest'
import { isStaleBuildError } from './RouteError'

describe('isStaleBuildError', () => {
  it('matches the stale-chunk error in every engine wording', () => {
    // Chrome
    expect(
      isStaleBuildError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://app.kashpoint.co.za/assets/Dashboard-DssARmMT.js'
        )
      )
    ).toBe(true)
    // Safari
    expect(
      isStaleBuildError(new TypeError('Importing a module script failed.'))
    ).toBe(true)
    // Firefox
    expect(
      isStaleBuildError(
        new TypeError('error loading dynamically imported module')
      )
    ).toBe(true)
  })

  it('accepts a bare string as well as an Error', () => {
    expect(isStaleBuildError('Failed to fetch dynamically imported module')).toBe(true)
  })

  it('does not match ordinary application errors', () => {
    // A false positive here reloads the page under the user instead of showing
    // them the real error, so this boundary matters.
    expect(isStaleBuildError(new Error('Network request failed'))).toBe(false)
    expect(isStaleBuildError(new Error('Cannot read properties of undefined'))).toBe(false)
    expect(isStaleBuildError(new Error('Request failed with status code 500'))).toBe(false)
    expect(isStaleBuildError(null)).toBe(false)
    expect(isStaleBuildError(undefined)).toBe(false)
  })
})
