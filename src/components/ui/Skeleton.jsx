import clsx from 'clsx'

/**
 * Loading placeholder. The default is a subtle pulse so screens that show
 * many skeletons (lists, tables) don't strobe. Pass `shimmer` for the
 * sweeping gradient effect — better on hero/featured surfaces.
 */
export function Skeleton({ className = '', shimmer = false }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={clsx(
        'relative overflow-hidden rounded-md bg-slate-200/70 dark:bg-slate-800/60',
        shimmer ? 'isolate' : 'animate-pulse',
        className,
      )}
    >
      {shimmer && (
        <span
          className={clsx(
            'absolute inset-0 -translate-x-full animate-shimmer',
            'bg-gradient-to-r from-transparent via-white/40 to-transparent',
            'dark:via-white/10',
          )}
          aria-hidden
        />
      )}
    </div>
  )
}

/** A row of placeholder lines — drop-in for "loading text" blocks. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}
