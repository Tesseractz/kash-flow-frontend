import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlanAPI } from '../api/client'

// What this device saw last time. /plan is a network round trip, and on a cold
// Render dyno it can take tens of seconds; without a remembered answer the nav
// spends that whole time rendering as though the store had no subscription,
// which looks to a paying customer like their Pro features vanished.
const CACHE_KEY = 'kashpoint.plan.entitled'

function rememberedEntitlement() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    // Nothing remembered yet: assume entitled. Showing a nav item that turns
    // out to be paywalled is a much smaller failure than hiding one the
    // customer has already paid for.
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

function rememberEntitlement(value) {
  try {
    window.localStorage.setItem(CACHE_KEY, value ? '1' : '0')
  } catch {
    // Private browsing / storage disabled — the in-memory answer still works.
  }
}

export function usePlan() {
  const query = useQuery({
    queryKey: ['plan'],
    queryFn: () => PlanAPI.get(),
    staleTime: 30000,
  })

  const plan = query.data
  // null means "not answered yet", which is different from "not subscribed".
  const known = plan ? !!(plan.is_active || plan.is_on_trial) : null

  useEffect(() => {
    if (known !== null) rememberEntitlement(known)
  }, [known])

  return {
    ...query,
    plan,
    isSubscribedOrTrial: known === null ? rememberedEntitlement() : known,
  }
}
