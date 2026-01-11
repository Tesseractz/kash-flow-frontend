import clsx from 'clsx'
import { forwardRef } from 'react'

export const Input = forwardRef(function Input({ 
  className = '', 
  label,
  error,
  icon: Icon,
  ...props 
}, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-lg border bg-white px-4 py-2.5 text-slate-800',
            'placeholder-slate-400 outline-none transition-all duration-200',
            'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300',
            Icon && 'pl-10',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

export const Select = forwardRef(function Select({
  className = '',
  label,
  error,
  children,
  ...props
}, ref) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full rounded-lg border bg-white px-4 py-2.5 text-slate-800',
          'outline-none transition-all duration-200 cursor-pointer',
          'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
          error ? 'border-red-500' : 'border-slate-300',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})
