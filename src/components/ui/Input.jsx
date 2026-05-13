import clsx from 'clsx'
import { forwardRef } from 'react'

/**
 * Input — single-line text field with optional label, leading icon, and
 * trailing slot (use `trailing` for inline action buttons / units).
 */
export const Input = forwardRef(function Input(
  { className = '', label, error, icon: Icon, trailing, hint, id, ...props },
  ref,
) {
  const inputId = id || (label ? `i-${Math.random().toString(36).slice(2, 9)}` : undefined)
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          className={clsx(
            'w-full h-11 rounded-xl border bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500',
            'outline-none transition-all duration-200 ease-out-expo',
            // Generous left padding when there's an icon; trailing slot reserves right space.
            Icon ? 'pl-10' : 'pl-4',
            trailing ? 'pr-12' : 'pr-4',
            error
              ? 'border-red-400 dark:border-red-500/70 focus:border-red-500 focus:shadow-[0_0_0_4px_rgb(239_68_68_/_0.15)]'
              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-brand-500 focus:shadow-focus-ring',
            'disabled:bg-slate-50 dark:disabled:bg-slate-900/60 disabled:cursor-not-allowed disabled:opacity-70',
            className,
          )}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {trailing}
          </div>
        )}
      </div>
      {(error || hint) && (
        <p
          className={clsx(
            'mt-1.5 text-xs',
            error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  )
})

export const Select = forwardRef(function Select(
  { className = '', label, error, hint, children, ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full h-11 rounded-xl border bg-white dark:bg-slate-900',
          'text-slate-900 dark:text-slate-100 px-4',
          'outline-none transition-all duration-200 ease-out-expo cursor-pointer',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 focus:border-brand-500 focus:shadow-focus-ring',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {(error || hint) && (
        <p
          className={clsx(
            'mt-1.5 text-xs',
            error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400',
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  )
})
