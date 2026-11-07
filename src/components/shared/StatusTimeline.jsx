import { Check, Clock, Loader2, X, Minus } from 'lucide-react'
import { STATUS } from '@/lib/constants'
import { bankLabel } from '@/lib/bank'
import { formatINR } from '@/lib/utils'
import { cn, formatDateTime } from '@/lib/utils'

/** Build the 5-step customer-facing progress from an application. */
export function buildSteps(app, agentName) {
  const s = app.status
  const findAt = (action) => app.history.find((h) => h.action === action)?.at
  const done = (title, description, at) => ({ title, state: 'complete', label: 'Completed', description, at })
  const steps = []

  steps.push(done('Application submitted', 'You submitted your loan application.', app.createdAt))

  if (s === STATUS.UNASSIGNED) {
    steps.push({ title: 'Agent assigned', state: 'current', label: 'In progress', description: 'Your application is shared with agents in your area. The first agent to accept it will handle your loan.' })
  } else {
    steps.push(done('Agent assigned', `${agentName ? `${agentName}, an agent in your area,` : 'An agent in your area'} accepted your application.`, findAt('Accepted by agent')))
  }

  if ([STATUS.UNASSIGNED].includes(s)) steps.push({ title: 'Agent verification', state: 'pending', label: 'Pending', description: 'Agent reviews your information.' })
  else if ([STATUS.ASSIGNED, STATUS.IN_VERIFICATION].includes(s))
    steps.push({ title: 'Agent verification', state: 'current', label: 'In progress', description: 'Agent reviews your information.' })
  else if (s === STATUS.AGENT_REJECTED)
    steps.push({ title: 'Agent verification', state: 'failed', label: 'Not verified', description: app.agentDecision?.reason || 'Agent could not verify your details.', at: app.agentDecision?.at })
  else steps.push(done('Agent verification', 'Agent verified your information and recommended approval.', app.agentDecision?.at))

  if (s === STATUS.AGENT_APPROVED) steps.push({ title: 'Manager approval', state: 'current', label: 'In progress', description: "Manager reviews the agent's recommendation." })
  else if (s === STATUS.APPROVED || s === STATUS.DISBURSED) steps.push(done('Manager approval', 'Manager approved the recommendation.', app.managerDecision?.at))
  else if (s === STATUS.REJECTED)
    steps.push({ title: 'Manager approval', state: 'failed', label: 'Declined', description: app.managerDecision?.reason, at: app.managerDecision?.at })
  else if (s === STATUS.AGENT_REJECTED) steps.push({ title: 'Manager approval', state: 'skipped', label: 'Skipped', description: 'Not required — application closed at verification.' })
  else steps.push({ title: 'Manager approval', state: 'pending', label: 'Pending', description: "Manager reviews the agent's recommendation." })

  if (s === STATUS.APPROVED || s === STATUS.DISBURSED) steps.push({ ...done('Final decision', 'Congratulations! Your loan has been approved.', app.managerDecision?.at), label: 'Approved' })
  else if (s === STATUS.REJECTED || s === STATUS.AGENT_REJECTED)
    steps.push({ title: 'Final decision', state: 'failed', label: 'Rejected', description: 'Your loan application was not approved.', at: (app.managerDecision || app.agentDecision)?.at })
  else steps.push({ title: 'Final decision', state: 'pending', label: 'Pending', description: 'Loan approved or rejected.' })

  const to = bankLabel(app.bank)
  if (s === STATUS.DISBURSED)
    steps.push({ ...done('Amount disbursed', `${formatINR(app.disbursement.amount)} sent to ${to} via ${app.disbursement.mode} · UTR ${app.disbursement.utr}`, app.disbursement.at), label: 'Credited' })
  else if (s === STATUS.APPROVED) steps.push({ title: 'Amount disbursed', state: 'current', label: 'Processing', description: `Transfer to ${to} is being processed.` })
  else if (s === STATUS.REJECTED || s === STATUS.AGENT_REJECTED) steps.push({ title: 'Amount disbursed', state: 'skipped', label: 'Not applicable', description: 'No amount is disbursed for rejected applications.' })
  else steps.push({ title: 'Amount disbursed', state: 'pending', label: 'Pending', description: `After approval, the amount is sent to ${to}.` })

  return steps
}

const icon = {
  complete: <Check className="size-4" strokeWidth={3} />,
  current: <Loader2 className="size-4 animate-spin" />,
  pending: <Clock className="size-4" />,
  failed: <X className="size-4" strokeWidth={3} />,
  skipped: <Minus className="size-4" />,
}
const dot = {
  complete: 'bg-success text-white ring-emerald-100',
  current: 'bg-primary text-white ring-teal-100',
  pending: 'bg-card text-muted-foreground ring-secondary border',
  failed: 'bg-destructive text-white ring-red-100',
  skipped: 'bg-secondary text-muted-foreground ring-secondary',
}
const pill = {
  complete: 'bg-emerald-50 text-emerald-700',
  current: 'bg-teal-50 text-teal-700',
  pending: 'bg-slate-100 text-slate-500',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-slate-100 text-slate-500',
}

export function StatusTimeline({ steps }) {
  return (
    <ol className="relative">
      {steps.map((st, i) => (
        <li key={st.title} className="relative flex gap-4 pb-7 last:pb-0">
          {i < steps.length - 1 && (
            <span className={cn('absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 rounded', st.state === 'complete' ? 'bg-success/60' : 'bg-border')} aria-hidden="true" />
          )}
          <span className={cn('relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4', dot[st.state])}>{icon[st.state]}</span>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn('font-bold', st.state === 'pending' && 'text-muted-foreground')}>
                {i + 1}. {st.title}
              </p>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', pill[st.state])}>{st.label}</span>
            </div>
            {st.description && <p className="mt-1 text-sm text-muted-foreground">{st.description}</p>}
            {st.at && <p className="mt-1 text-xs text-muted-foreground/80">{formatDateTime(st.at)}</p>}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Compact horizontal progress used in list rows. */
export function MiniProgress({ steps }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {steps.map((s) => (
        <span
          key={s.title}
          className={cn(
            'h-1.5 flex-1 rounded-full',
            s.state === 'complete' ? 'bg-success' : s.state === 'current' ? 'bg-primary/70' : s.state === 'failed' ? 'bg-destructive' : 'bg-border'
          )}
        />
      ))}
    </div>
  )
}
