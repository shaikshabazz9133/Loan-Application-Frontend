import { cn } from '@/lib/utils'

export const Separator = ({ className, vertical }) => (
  <div role="separator" className={cn('shrink-0 bg-border', vertical ? 'h-full w-px' : 'h-px w-full', className)} />
)

export const Progress = ({ value = 0, className, indicatorClassName }) => (
  <div className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className={cn('h-full rounded-full bg-primary transition-all duration-500', indicatorClassName)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
)

export const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-md bg-secondary', className)} />
