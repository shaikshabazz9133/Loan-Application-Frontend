import { Check, Clock, Loader2, X, Minus } from 'lucide-react'
import { STATUS } from '@/lib/constants'
import { cn, formatDateTime, formatINR } from '@/lib/utils'

/**
 * The 4 steps a customer sees, built from the public status (POST /applications/track):
 * submitted -> agent review -> manager approval -> money sent.
 */
export function buildSteps(t) {
  const s = t.status
  const at = (action) => t.steps.find((h) => h.action === action)?.at
  const done = (title, description, when, label = 'Done') => ({ title, state: 'complete', label, description, at: when })
  const rejectedByAgent = s === STATUS.AGENT_REJECTED
  const rejected = s === STATUS.REJECTED || rejectedByAgent
  const steps = [done('Application submitted', 'We received your application and documents.', t.createdAt)]

  if (s === STATUS.UNASSIGNED) steps.push({ title: 'Agent review', state: 'current', label: 'Waiting', description: 'Waiting for an agent to pick up your application.' })
  else if (s === STATUS.ASSIGNED) steps.push({ title: 'Agent review', state: 'current', label: 'In progress', description: `${t.agentName || 'An agent'} is checking your details and documents.`, at: at('Accepted by agent') })
  else if (rejectedByAgent) steps.push({ title: 'Agent review', state: 'failed', label: 'Not approved', description: t.agentDecision?.reason, at: t.agentDecision?.at })
  else if (s === STATUS.REJECTED && !t.agentDecision) steps.push({ title: 'Agent review', state: 'skipped', label: 'Skipped', description: 'Closed before an agent review.' })
  else steps.push(done('Agent review', `${t.agentName || 'The agent'} checked your details and recommended approval.`, t.agentDecision?.at))

  if (s === STATUS.AGENT_APPROVED) steps.push({ title: 'Final approval', state: 'current', label: 'In progress', description: 'The branch manager is reviewing your application.' })
  else if (s === STATUS.APPROVED || s === STATUS.DISBURSED) steps.push(done('Final approval', 'Your loan is approved.', t.managerDecision?.at, 'Approved'))
  else if (s === STATUS.REJECTED) steps.push({ title: 'Final approval', state: 'failed', label: 'Not approved', description: t.managerDecision?.reason, at: t.managerDecision?.at })
  else steps.push({ title: 'Final approval', state: rejectedByAgent ? 'skipped' : 'pending', label: rejectedByAgent ? 'Skipped' : 'Pending', description: 'The branch manager gives the final decision.' })

  if (s === STATUS.DISBURSED) steps.push(done('Money sent', `${formatINR(t.disbursement.amount)} sent to ${t.bankLabel} via ${t.disbursement.mode}. Reference (UTR): ${t.disbursement.utr}`, t.disbursement.at, 'Sent'))
  else if (s === STATUS.APPROVED) steps.push({ title: 'Money sent', state: 'current', label: 'Processing', description: `The amount will be sent to ${t.bankLabel}.` })
  else steps.push({ title: 'Money sent', state: rejected ? 'skipped' : 'pending', label: rejected ? 'Not applicable' : 'Pending', description: `After approval, the amount is sent to ${t.bankLabel}.` })

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
