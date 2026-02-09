import { useEffect } from 'react'
import { X } from 'lucide-react'

// Composable Dialog Components
export function Dialog({ open, onOpenChange, children, title, footer, onClose }) {
  // Support both old (onClose) and new (onOpenChange) APIs
  const handleClose = () => {
    onClose?.()
    onOpenChange?.(false)
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') handleClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  // Old API: title and footer as props
  if (title !== undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
        <div className="relative w-[95vw] max-w-lg rounded-lg bg-white dark:bg-slate-800 shadow-xl">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          <div className="p-4">{children}</div>
          {footer ? <div className="p-4 border-t border-slate-200 dark:border-slate-700">{footer}</div> : null}
        </div>
      </div>
    )
  }

  // New API: composable children
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      {children}
    </div>
  )
}

export function DialogContent({ children, className = '' }) {
  return (
    <div className={`relative w-full max-w-lg rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  )
}

export function DialogHeader({ children, className = '' }) {
  return (
    <div className={`px-6 pt-6 pb-4 ${className}`}>
      {children}
    </div>
  )
}

export function DialogTitle({ children, className = '' }) {
  return (
    <h2 className={`text-lg font-semibold text-slate-900 dark:text-white ${className}`}>
      {children}
    </h2>
  )
}

export function DialogDescription({ children, className = '' }) {
  return (
    <p className={`mt-1 text-sm text-slate-500 dark:text-slate-400 ${className}`}>
      {children}
    </p>
  )
}

export function DialogFooter({ children, className = '' }) {
  return (
    <div className={`flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  )
}

export function DialogClose({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      {children || <X size={20} />}
    </button>
  )
}