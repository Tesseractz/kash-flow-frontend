// The profile — and therefore the user's role — arrives from a separate API
// call after the session is already restored. Until it lands, `isAdmin` is
// false, so an owner sees a cashier's navigation: Sell, Products and Privacy,
// with Dashboard, Transactions, Customers, Expenses, Team and Billing all
// missing. On a cold backend that lasts several seconds, and it repeats on
// every refresh.
//
// Remembering the last profile lets the app render the right navigation
// immediately and correct itself when the server answers.
//
// Keyed by user id and only ever read back for that same id, so signing in as
// somebody else cannot inherit the previous user's role. This is a rendering
// hint only — every admin-only route is enforced by the backend regardless of
// what the nav shows.
const KEY = 'kashpoint.profile.v1'

export function readCachedProfile(userId) {
  if (!userId) return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.userId !== userId || !parsed.profile) return null
    if (typeof parsed.profile.role !== 'string') return null
    return parsed.profile
  } catch {
    return null
  }
}

export function writeCachedProfile(userId, profile) {
  if (!userId || !profile || typeof profile.role !== 'string') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ userId, profile }))
  } catch {
    /* storage unavailable — the app still works, just without the head start */
  }
}

export function clearCachedProfile() {
  try {
    window.localStorage.removeItem(KEY)
    // The remembered plan belongs to the account that just signed out.
    window.localStorage.removeItem('kashpoint.plan.v1')
  } catch {
    /* ignore */
  }
}
