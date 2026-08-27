import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlanAPI } from '../api/client'

// The last plan this device saw, kept verbatim.
//
// /plan is a network round trip. On a cold Render dyno it can take tens of
// seconds, and on a flaky till connection it can fail outright. Treating "no
// answer yet" as "no subscription" makes a paying customer watch their Pro
// features disappear on every single load — and again on every refresh.
// Rendering last-known-good instantly, then correcting when the server answers,
// removes the flash entirely.
const CACHE_KEY = 'kashpoint.plan.v1'

function readCachedPlan() {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Guard against a half-written or older-shaped value.
    if (!parsed || typeof parsed !== 'object' || typeof parsed.plan !== 'string') {
      return null
    }
    return parsed
  } catch {
    // Private browsing, disabled storage, or malformed JSON — fall through to
    // the network like a first-time visitor.
    return null
  }
}

function writeCachedPlan(plan) {
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...plan, cachedAt: Date.now() })
    )
  } catch {
    /* storage unavailable — the in-memory answer still works */
  }
}

export function usePlan() {
  // Read once per mount. Re-reading on every render would fight the query cache.
  const cached = useMemo(() => readCachedPlan(), [])

  const query = useQuery({
    queryKey: ['plan'],
    queryFn: () => PlanAPI.get(),
    staleTime: 30000,
    initialData: cached ?? undefined,
    // Dated to the epoch so the cached value renders immediately but is still
    // considered stale, which triggers a refetch on mount. Without this the
    // cache would suppress the request for staleTime and the plan could go
    // half a minute out of date after a subscription change.
    initialDataUpdatedAt: 0,
    // Hold the previous answer while refetching rather than dropping to
    // undefined, which is what produced the flash in the first place.
    placeholderData: (previous) => previous,
  })

  const plan = query.data

  useEffect(() => {
    if (plan && !query.isError) writeCachedPlan(plan)
  }, [plan, query.isError])

  // Only a fresh answer, fetched during this mount, may take features away.
  // A remembered plan can grant access instantly, but it must never withhold
  // it: the cache outlives the fact it recorded, so a store that was expired
  // an hour ago and has since paid would otherwise render locked on every load
  // until the request came back — which is the delay users actually notice.
  const answered = query.isFetchedAfterMount && !query.isError

  return {
    ...query,
    plan,
    isSubscribedOrTrial:
      answered && plan ? !!(plan.is_active || plan.is_on_trial) : true,
  }
}
