import { forwardRef } from 'react'
import clsx from 'clsx'

/**
 * Brand button. Variants:
 *   primary     — brand gradient on solid surface, gentle lift on hover
 *   secondary   — neutral surface, used for "alternative" actions
 *   success     — green gradient (use sparingly — only for positive end-states)
 *   danger      — red gradient (destructive irrevocable actions)
 *   destructive — alias for danger
 *   ghost       — borderless, used inside cards / toolbars
 *   outline     — bordered, transparent fill — secondary surface where ghost is too quiet
 *
 * Every variant has a soft drop shadow tinted with the variant color so the
 * button reads as raised on light surfaces without looking like a sticker.
 */
const variants = {
  primary:
    'text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 ' +
    'shadow-brand hover:shadow-soft-lg focus-visible:ring-brand-500',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 ' +
    'dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ' +
    'shadow-soft focus-visible:ring-slate-400',
  success:
    'text-white bg-accent-600 hover:bg-accent-700 active:bg-accent-800 ' +
    'shadow-accent hover:shadow-soft-lg focus-visible:ring-accent-500',
  // The KashPoint mark and the landing page are green; `primary` is blue.
  // Public surfaces (sign-in, sign-up) use this so the first screen a customer
  // sees matches the brand they just clicked through from. Same paint as
  // `success`, different meaning — this is a call to action, not an outcome.
  accent:
    'text-white bg-accent-600 hover:bg-accent-700 active:bg-accent-800 ' +
    'shadow-accent hover:shadow-soft-lg focus-visible:ring-accent-500',
  danger:
    'text-white bg-red-600 hover:bg-red-700 active:bg-red-800 ' +
    'shadow-danger hover:shadow-soft-lg focus-visible:ring-red-500',
  destructive:
    'text-white bg-red-600 hover:bg-red-700 active:bg-red-800 ' +
    'shadow-danger hover:shadow-soft-lg focus-visible:ring-red-500',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 ' +
    'dark:text-slate-200 dark:hover:bg-slate-800 ' +
    'focus-visible:ring-slate-400',
  outline:
    'bg-transparent text-brand-700 border border-brand-200 hover:bg-brand-50 ' +
    'dark:text-brand-300 dark:border-brand-900/60 dark:hover:bg-brand-900/20 ' +
    'focus-visible:ring-brand-500',
}

const sizes = {
  xs: 'h-7  px-2.5 text-xs gap-1',
  sm: 'h-8  px-3   text-sm gap-1.5',
  md: 'h-10 px-4   text-sm gap-2',
  lg: 'h-11 px-5   text-base gap-2',
  xl: 'h-12 px-6   text-base gap-2.5',
}

export const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        // base — uniform height + line-height keep buttons crisp next to inputs
        'inline-flex items-center justify-center whitespace-nowrap',
        'rounded-lg font-medium leading-none select-none',
        'transition-all duration-200 ease-out-expo',
        'active:scale-[0.98]',
        // accessibility / states
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'dark:focus-visible:ring-offset-slate-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
