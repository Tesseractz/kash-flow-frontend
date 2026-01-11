import { useEffect } from 'react'

export function Dialog({ open, onClose, title, children, footer }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[95vw] max-w-lg rounded-lg bg-white shadow-xl">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="p-4">{children}</div>
        {footer ? <div className="p-4 border-t">{footer}</div> : null}
      </div>
    </div>
  )
}


