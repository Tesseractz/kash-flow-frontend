import clsx from 'clsx'

/**
 * Surface primitives. A Card is the basic content container; StatCard is a
 * specialized variant for the dashboard tiles. Both keep dark-mode parity.
 *
 * Use `hover` on Cards that link somewhere or open something. Use `interactive`
 * for keyboard-focusable cards (buttons-as-cards).
 */
export function Card({ children, className = '', hover = false, interactive = false, as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={clsx(
        'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800',
        'shadow-soft',
        hover && 'transition-all duration-200 hover:shadow-soft-lg hover:border-slate-300/80 dark:hover:border-slate-700',
        interactive && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={clsx('px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', as: Component = 'h3' }) {
  return (
    <Component
      className={clsx(
        'font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-white',
        className,
      )}
    >
      {children}
    </Component>
  )
}

export function CardDescription({ children, className = '' }) {
  return (
    <p className={clsx('text-sm text-slate-500 dark:text-slate-400 mt-1', className)}>
      {children}
    </p>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={clsx('px-5 sm:px-6 py-4', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div
      className={clsx(
        'px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800',
        'bg-slate-50/60 dark:bg-slate-900/40 rounded-b-2xl',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * StatCard — the dashboard tile. Optional `accent` colors the icon chip
 * ("brand" | "accent" | "warm" | "neutral").
 */
const statAccents = {
  brand:   'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300',
  accent:  'bg-accent-50 text-accent-600 dark:bg-accent-950/60 dark:text-accent-300',
  warm:    'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, accent = 'brand', className = '' }) {
  return (
    <Card className={clsx('group transition-all duration-200', className)} hover>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {title}
            </p>
            <p className="font-display text-3xl font-semibold tabular-nums text-slate-900 dark:text-white mt-2 break-words">
              {value}
            </p>
            {trend && (
              <p
                className={clsx(
                  'text-sm mt-2 inline-flex items-center gap-1 font-medium',
                  trendUp ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400',
                )}
              >
                <span aria-hidden>{trendUp ? '↑' : '↓'}</span>
                {trend}
              </p>
            )}
          </div>
          {Icon && (
            <div
              className={clsx(
                'p-3 rounded-2xl transition-transform duration-200 group-hover:scale-105',
                statAccents[accent] || statAccents.brand,
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
