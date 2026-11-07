import { Bot, Briefcase, ShieldCheck, User } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'

const roleIcon = { customer: User, agent: Briefcase, manager: ShieldCheck, system: Bot }
const roleTone = {
  customer: 'bg-sky-50 text-sky-700',
  agent: 'bg-indigo-50 text-indigo-700',
  manager: 'bg-teal-50 text-teal-700',
  system: 'bg-slate-100 text-slate-600',
}

export function ActivityLog({ history }) {
  const items = [...history].reverse()
  return (
    <ol className="space-y-4">
      {items.map((h) => {
        const Icon = roleIcon[h.actorRole] || Bot
        return (
          <li key={h.id} className="flex gap-3">
            <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', roleTone[h.actorRole])}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{h.action}</p>
              {h.note && <p className="text-sm text-muted-foreground break-words">{h.note}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground/80">
                {h.actorName} · <span className="capitalize">{h.actorRole}</span> · {formatDateTime(h.at)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
