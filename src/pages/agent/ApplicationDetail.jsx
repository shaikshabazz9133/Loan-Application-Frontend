import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, FileText, Hand, Info, Loader2, ThumbsUp, UserX, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { STATUS } from '@/lib/constants'
import { emiOf } from '@/lib/kyc'
import { formatDateTime, formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ApplicantCard } from '@/components/shared/ApplicantCard'
import { DocumentList } from '@/components/shared/Documents'
import { ActivityLog } from '@/components/shared/ActivityLog'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { useAcceptApplication } from '@/components/shared/OpenRequest'

/** Agent: accept an open application, check details + documents, then approve (recommend) or reject. */
export default function AgentApplicationDetail() {
  const { id } = useParams()
  const { applications, currentUser: me, approveApplication, rejectApplication } = useStore()
  const { accept, busy } = useAcceptApplication()
  const [dialog, setDialog] = useState(null)
  const app = applications.find((a) => a.id === id)

  if (!app)
    return (
      <Card>
        <EmptyState icon={UserX} title="Application not available" description="It may have been accepted by another agent." action={<Button asChild><Link to="/agent/applications">Back to applications</Link></Button>} />
      </Card>
    )

  const open = app.status === STATUS.UNASSIGNED
  const mine = app.agentId === me.id
  const canDecide = mine && app.status === STATUS.ASSIGNED
  const emi = emiOf(app)

  return (
    <div>
      <PageHeader
        back={{ to: '/agent/applications', label: 'Applications' }}
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
            <div className="h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500" />
            <CardHeader>
              <CardTitle>{open ? 'Take this application?' : 'Your decision'}</CardTitle>
              <CardDescription>
                {open ? 'The first agent to accept takes it. Then only you can review it.' : 'Check the details and documents, then approve or reject.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {open ? (
                <Button className="w-full" size="lg" onClick={() => accept(app)} disabled={busy === app.id}>
                  {busy === app.id ? <Loader2 className="animate-spin" /> : <Hand />} Accept application
                </Button>
              ) : canDecide ? (
                <>
                  <Button className="w-full" variant="success" size="lg" onClick={() => setDialog('approve')}>
                    <ThumbsUp /> Approve & send to manager
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setDialog('reject')}>
                    <XCircle className="text-destructive" /> Reject application
                  </Button>
                  <p className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    <span>Your approval is a <b>recommendation</b>. The branch manager makes the final decision.</span>
                  </p>
                </>
              ) : (
                <DecisionSummary app={app} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle>Loan details</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Amount', formatINR(app.amount)],
                  ['Tenure', `${app.tenure} months`],
                  ['Monthly EMI', formatINR(emi)],
                  ['Interest rate', app.interestRatePa != null ? `${app.interestRatePa}% p.a.` : '—'],
                  ['Total payable', formatINR(emi * app.tenure)],
                  ['Credit score', app.creditScore ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-muted/60 px-3 py-2">
                    <dt className="text-[11px] text-muted-foreground">{k}</dt>
                    <dd className="font-bold tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <ReasonDialog
        open={dialog === 'approve'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Approve and send to the manager"
        description="The branch manager will give the final decision."
        label="Note for the manager (optional)"
        placeholder="e.g. Documents checked, income looks stable."
        confirmLabel="Approve"
        variant="success"
        presets={['All documents verified. Low risk.', 'Stable income, address confirmed.']}
        onConfirm={async (note) => {
          await approveApplication(app.id, note)
          toast.success('Sent to the manager', { description: `${app.id} is waiting for final approval.` })
        }}
      />
      <ReasonDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Reject application"
        description="The customer will see this reason on their status page."
        label="Rejection reason"
        placeholder="Explain why this application is being rejected…"
        confirmLabel="Reject application"
        variant="destructive"
        required
        presets={['Income could not be verified', 'Documents do not match', 'Customer unreachable', 'EMI is more than 50% of income']}
        onConfirm={async (reason) => {
          await rejectApplication(app.id, reason)
          toast.error('Application rejected', { description: app.id })
        }}
      />
    </div>
  )
}

function DecisionSummary({ app }) {
  const d = app.agentDecision
  if (!d) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="size-4" /> Another agent is handling this application.</p>
  const ok = d.decision === 'recommended'
  const manager =
    app.status === STATUS.DISBURSED ? 'Approved & amount sent' : app.status === STATUS.APPROVED ? 'Approved' : app.status === STATUS.REJECTED ? `Rejected: ${app.managerDecision?.reason}` : 'Waiting for review'
  return (
    <div className={`rounded-xl p-4 ${ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
      <p className="flex items-center gap-2 font-bold">
        {ok ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
        {ok ? 'You approved this application' : 'You rejected this application'}
      </p>
      <p className="mt-2 text-sm">{ok ? d.note || 'No note added.' : d.reason}</p>
      <p className="mt-2 text-xs opacity-70">{formatDateTime(d.at)}</p>
      {ok && <p className="mt-3 border-t border-emerald-200 pt-3 text-sm font-semibold">Manager: {manager}</p>}
    </div>
  )
}
