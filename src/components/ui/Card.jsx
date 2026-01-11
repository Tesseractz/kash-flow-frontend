import clsx from 'clsx'

export function Card({ children, className = '', hover = false }) {
  return (
    <div className={clsx(
      'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm',
      hover && 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200',
      className
    )}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={clsx('px-6 py-4 border-b border-slate-100 dark:border-slate-700', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '', as: Component = 'h3' }) {
  return (
    <Component className={clsx('text-lg font-semibold text-slate-800 dark:text-white', className)}>
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
    <div className={clsx('px-6 py-4', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={clsx('px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-b-xl', className)}>
      {children}
    </div>
  )
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, className = '' }) {
  return (
    <Card className={className}>
      <CardContent className="py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
            {trend && (
              <p className={clsx(
                'text-sm mt-2 flex items-center gap-1',
                trendUp ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trendUp ? '↑' : '↓'} {trend}
              </p>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-blue-50 rounded-xl">
              <Icon className="w-6 h-6 text-blue-600" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
