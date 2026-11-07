import { cn } from '@/lib/utils'

export function InfoGrid({ items, className }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {items.map(([label, value, Icon]) => (
        <div key={label} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {Icon && <Icon className="size-3.5" />} {label}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
