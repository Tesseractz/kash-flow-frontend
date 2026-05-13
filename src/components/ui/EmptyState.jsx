import clsx from 'clsx'

/**
 * EmptyState — used wherever a page has no data yet (no products, no sales,
 * no customers, no expenses). Centered, friendly, with a clear primary CTA
 * so the user always has a next action.
 *
 * Usage:
 *   <EmptyState
 *     icon={Package}
 *     title="No products yet"
 *     description="Add your first product to start selling."
 *     action={<Button onClick={...}>Add product</Button>}
 *   />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
  compact = false,
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-14',
        className,
      )}
    >
      {Icon && (
        <div
          className={clsx(
            // Layered icon chip: brand-tinted gradient ring + soft inner fill
            'relative mb-4 rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100',
            'dark:from-brand-950/60 dark:to-brand-900/40',
            'p-4 ring-1 ring-brand-100 dark:ring-brand-900/40',
            'shadow-soft',
          )}
        >
          <Icon className="w-7 h-7 text-brand-600 dark:text-brand-300" aria-hidden />
        </div>
      )}
      {title && (
        <h3 className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
      )}
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
