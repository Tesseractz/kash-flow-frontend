import { forwardRef } from 'react'
import clsx from 'clsx'

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-400',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400',
  outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 focus:ring-blue-500',
}

const sizes = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 gap-2',
  lg: 'px-5 py-2.5 text-lg gap-2',
  xl: 'px-6 py-3 text-xl gap-3',
}

export const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
})
