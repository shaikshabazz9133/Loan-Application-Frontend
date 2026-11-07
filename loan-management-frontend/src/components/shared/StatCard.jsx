import { cn } from '@/lib/utils'

const tones = {
  teal: 'bg-teal-50 text-teal-700 ring-teal-100',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  slate: 'bg-slate-50 text-slate-700 ring-slate-100',
}

export function StatCard({ label, value, icon: Icon, tone = 'teal', hint, onClick, active, className, style }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      style={style}
      className={cn(
        'group relative flex w-full items-start gap-4 overflow-hidden rounded-xl border bg-card p-4 text-left shadow-soft transition-all animate-fade-up',
        onClick && 'hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active && 'ring-2 ring-primary',
        className
      )}
    >
      {Icon && (
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl ring-1', tones[tone])}>
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold tabular">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Comp>
  )
}
