import { useEffect } from 'react'
import { Minimize2 } from 'lucide-react'

/**
 * Full-screen takeover for dense content — tables, mainly. A fixed overlay
 * rather than the Fullscreen API, because iOS Safari does not allow
 * requestFullscreen on arbitrary elements and a till is often a phone or an
 * iPad. Esc closes; body scroll is locked while open.
 *
 * The caller keeps ownership of the content: render the same element inline
 * normally, and inside this panel when expanded.
 */
export default function FullScreenPanel({ title, meta, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[70] flex flex-col bg-slate-50 dark:bg-slate-950"
    >
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
        <div className="hidden sm:flex items-center gap-3 min-w-0">{meta}</div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        >
          <Minimize2 size={14} />
          Exit full screen
          <kbd className="hidden sm:inline text-[10px] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded px-1">Esc</kbd>
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-3">{children}</div>
    </div>
  )
}
