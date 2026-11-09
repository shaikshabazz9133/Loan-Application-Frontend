import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, Briefcase, CheckCircle2, FileText, Lock, Quote, Send, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { STATUS, isPending } from '@/lib/constants'
import { bankLabel } from '@/lib/bank'
import { cn, formatDateTime, formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ApplicantCard } from '@/components/shared/ApplicantCard'
import { DocumentList } from '@/components/shared/Documents'
import { DisbursementCard } from '@/components/shared/Disbursement'
import { ActivityLog } from '@/components/shared/ActivityLog'
import { ReasonDialog } from '@/components/shared/ReasonDialog'

/** Manager: final approve / reject after the agent's recommendation, then disburse. */
export default function ManagerApplicationDetail() {
  const { id } = useParams()
  const { applications, approveApplication, rejectApplication, disburseApplication } = useStore()
  const [dialog, setDialog] = useState(null)
  const app = applications.find((a) => a.id === id)
  if (!app) return <Card><EmptyState icon={FileText} title="Application not found" action={<Button asChild><Link to="/manager/applications">Back</Link></Button>} /></Card>

  const canApprove = app.status === STATUS.AGENT_APPROVED
  const canReject = isPending(app.status)

  return (
    <div>
      <PageHeader
        back={{ to: '/manager/applications', label: 'Applications' }}
        title={app.fullName}
        description={`${app.id} · Applied ${formatDateTime(app.createdAt)}`}
        actions={<StatusBadge status={app.status} className="px-3 py-1 text-sm" />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ApplicantCard app={app} />
          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent><DocumentList app={app} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>History</CardTitle></CardHeader>
            <CardContent><ActivityLog history={app.history} /></CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className={cn('h-1', canApprove ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-border')} />
            <CardHeader>
              <CardTitle>Final decision</CardTitle>
              <CardDescription>You can approve once the agent has approved.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="flex items-center gap-2 text-sm"><Briefcase className="size-4 text-muted-foreground" /> Agent: <b>{app.agentName || 'Not accepted yet'}</b></p>
              {app.managerDecision ? (
                <ManagerDecision d={app.managerDecision} />
              ) : app.status === STATUS.AGENT_REJECTED ? (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
                  <p className="flex items-center gap-2 font-bold"><XCircle className="size-5" /> Closed: rejected by the agent</p>
                  <p className="mt-2">{app.agentDecision?.reason}</p>
                </div>
              ) : (
                <>
                  {app.agentDecision?.decision === 'recommended' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><BadgeCheck className="size-4" /> Approved by the agent</p>
                      <p className="mt-2 flex gap-2 text-sm text-emerald-900"><Quote className="size-4 shrink-0 opacity-50" />{app.agentDecision.note || 'No note added.'}</p>
                      <p className="mt-2 text-xs text-emerald-700">{app.agentDecision.by} · {formatDateTime(app.agentDecision.at)}</p>
                    </div>
                  )}
                  {!canApprove && (
                    <div className="flex items-start gap-3 rounded-xl border border-dashed p-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary"><Lock className="size-4 text-muted-foreground" /></span>
                      <p className="text-sm text-muted-foreground">
                        {app.status === STATUS.UNASSIGNED ? 'Waiting for an agent to accept it.' : 'Waiting for the agent to approve or reject it.'}
                      </p>
                    </div>
                  )}
                  <Button className="w-full" size="lg" variant="success" disabled={!canApprove} onClick={() => setDialog('approve')}>
                    {canApprove ? <CheckCircle2 /> : <Lock />} Approve loan
                  </Button>
                  <Button className="w-full" variant="outline" disabled={!canReject} onClick={() => setDialog('reject')}>
                    <XCircle className="text-destructive" /> Reject with reason
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <DisbursementCard
            app={app}
            showFullAccount
            action={
              app.status === STATUS.APPROVED ? (
                <Button className="w-full" size="lg" variant="success" onClick={() => setDialog('disburse')}>
                  <Send /> Disburse {formatINR(app.amount)}
                </Button>
              ) : null
            }
          />
        </div>
      </div>

      <DisburseDialog
        app={app}
        open={dialog === 'disburse'}
        onOpenChange={(o) => !o && setDialog(null)}
        onConfirm={async (mode) => {
          const updated = await disburseApplication(app.id, mode)
          toast.success(`${formatINR(app.amount)} sent`, { description: `To ${bankLabel(app.bank)} via ${mode} · UTR ${updated.disbursement.utr}` })
          setDialog(null)
        }}
      />
      <ReasonDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Approve this loan?"
        description={`Final approval for ${app.fullName}'s application ${app.id}.`}
        label="Approval note (optional)"
        placeholder="e.g. Approved as per agent recommendation."
        confirmLabel="Approve loan"
        variant="success"
        onConfirm={async (note) => {
          await approveApplication(app.id, note)
          toast.success('Loan approved', { description: `Next: disburse ${formatINR(app.amount)} to ${bankLabel(app.bank)}.` })
        }}
      />
      <ReasonDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Reject this application?"
        description="This is a final decision. The customer will see the reason."
        label="Rejection reason"
        placeholder="Explain why the loan is rejected…"
        confirmLabel="Reject application"
        variant="destructive"
        required
        presets={['EMI too high for the income', 'Insufficient documentation', 'Duplicate application', 'Policy limits exceeded']}
        onConfirm={async (reason) => {
          await rejectApplication(app.id, reason)
          toast.error('Application rejected', { description: app.id })
        }}
      />
    </div>
  )
}

function DisburseDialog({ app, open, onOpenChange, onConfirm }) {
  const [mode, setMode] = useState('IMPS')
  const modes = [
    ['IMPS', 'Instant, 24×7', app.amount <= 500000],
    ['NEFT', 'Within 2 hours', true],
    ['RTGS', 'Real-time, ₹2L and above', app.amount >= 200000],
  ]
  const valid = modes.find(([m]) => m === mode)?.[2] ? mode : 'NEFT'
  const [sending, setSending] = useState(false)
  const send = async () => {
    setSending(true)
    try {
      await onConfirm(valid)
    } catch (e) {
      toast.error('Could not disburse', { description: e.message })
    } finally {
      setSending(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disburse loan amount</DialogTitle>
          <DialogDescription>Transfer the approved amount to the customer's verified bank account. This can't be undone.</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</p>
          <p className="text-3xl font-extrabold tabular">{formatINR(app.amount)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-sm">
            {[
              ['To', app.bank?.holder],
              ['Bank', app.bank?.bankName],
              ['Account', app.bank?.account],
              ['IFSC', app.bank?.ifsc],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="font-semibold tabular">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Transfer mode</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Transfer mode">
            {modes.map(([m, hint, ok]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={valid === m}
                disabled={!ok}
                onClick={() => setMode(m)}
                className={cn('rounded-lg border p-2.5 text-left transition disabled:opacity-40', valid === m ? 'border-primary bg-accent ring-2 ring-primary/20' : 'hover:border-primary/50')}
              >
                <span className="block text-sm font-bold">{m}</span>
                <span className="block text-[11px] text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="success" disabled={sending} onClick={send}><Send /> {sending ? 'Sending…' : `Send ${formatINR(app.amount)}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManagerDecision({ d }) {
  const ok = d.decision === 'approved'
  return (
    <div className={cn('rounded-xl p-4', ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900')}>
      <p className="flex items-center gap-2 font-bold">{ok ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}{ok ? 'Loan approved' : 'Loan rejected'}</p>
      <p className="mt-2 text-sm">{ok ? d.note || 'No note added.' : d.reason}</p>
      <p className="mt-2 text-xs opacity-70">{d.by} · {formatDateTime(d.at)}</p>
    </div>
  )
}
