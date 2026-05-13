import clsx from 'clsx'

/**
 * Status badge. Replaces the ad-hoc <span class="inline-flex ... bg-emerald-100 ...">
 * pills scattered across pages. Use a semantic `tone` rather than a Tailwind color.
 *
 * Tones:
 *   success — active, paid, granted, done
 *   warning — trialing, pending, low stock
 *   danger  — canceled, past_due, blocked, error
 *   info    — neutral informational
 *   brand   — promoted / "Pro" highlights
 *   neutral — fallback (gray)
 *
 * Use `dot` for a small leading dot indicator (good in dense tables).
 */
const tones = {
  success: 'bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  danger:  'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  info:    'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  brand:   'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

const dotTones = {
  success: 'bg-accent-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
  info:    'bg-sky-500',
  brand:   'bg-brand-500',
  neutral: 'bg-slate-400',
}

const sizes = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs   px-2.5 py-1 gap-1.5',
}

export function Badge({
  tone = 'neutral',
  size = 'md',
  dot = false,
  icon: Icon,
  children,
  className = '',
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full ring-1 ring-inset',
        // Subtle inset ring tints the edge slightly darker for definition.
        'ring-slate-200/60 dark:ring-slate-700/60',
        tones[tone] || tones.neutral,
        sizes[size] || sizes.md,
        className,
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', dotTones[tone] || dotTones.neutral)}
          aria-hidden
        />
      )}
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </span>
  )
}
