import { useEffect } from 'react'
import { createPortal } from 'react-dom'
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

  let content
  if (title !== undefined) {
    content = (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
        <div className="relative w-full max-w-lg rounded-lg bg-white dark:bg-slate-800 shadow-xl max-h-[90vh] flex flex-col">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">{children}</div>
          {footer ? <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700">{footer}</div> : null}
        </div>
      </div>
    )
  } else {
    content = (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
      </div>
    )
  }

  return createPortal(content, document.body)
}

export function DialogContent({ children, className = '' }) {
  return (
    <div className={`relative w-full max-w-[calc(100vw-2rem)] sm:max-w-lg rounded-xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto ${className}`}>
      {children}
    </div>
  )
}

export function DialogHeader({ children, className = '' }) {
  return (
    <div className={`px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 ${className}`}>
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
    <div className={`flex flex-wrap justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-700 ${className}`}>
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