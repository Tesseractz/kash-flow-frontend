import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

// One reload is enough to pick up a new build. The timestamp guards against a
// reload loop when the chunk is genuinely missing rather than merely stale —
// after the window passes, a fresh failure is allowed to retry once more.
const RELOAD_KEY = 'kashpoint.chunk-reload-at'
const RELOAD_WINDOW_MS = 20000

/**
 * True for the error a browser raises when it is running a previous build's
 * index.html and asks for chunk filenames that no longer exist. The wording
 * differs per engine, so match all three.
 */
export function isStaleBuildError(error) {
  const message = String(error?.message || error || '')
  return (
    /dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  )
}

export default function RouteError() {
  const error = useRouteError()
  const stale = isStaleBuildError(error)

  useEffect(() => {
    if (!stale) return

    let last = 0
    try {
      last = Number(window.sessionStorage.getItem(RELOAD_KEY)) || 0
    } catch {
      // Storage unavailable — fall through and reload once anyway; the browser's
      // own repeated-navigation protection is the backstop.
    }

    if (Date.now() - last < RELOAD_WINDOW_MS) return

    try {
      window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      /* ignore */
    }
    window.location.reload()
  }, [stale])

  if (stale) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-brand-600 animate-spin dark:border-slate-700 dark:border-t-brand-400" />
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Updating to the latest version…
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {String(error?.message || 'An unexpected error occurred.')}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Reload
      </button>
    </div>
  )
}
