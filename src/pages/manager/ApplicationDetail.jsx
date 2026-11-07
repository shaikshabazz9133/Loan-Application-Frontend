import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, CheckCircle2, FileText, Lock, Phone, Quote, Radio, Send, UserPlus, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, rankAgents } from '@/lib/store'
import { ASSIGNMENT_RADIUS_KM, STATUS, isPending } from '@/lib/constants'
import { MIN_CREDIT_SCORE, creditBand } from '@/lib/kyc'
import { bankLabel } from '@/lib/bank'
import { DisbursementCard } from '@/components/shared/Disbursement'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { creditOk, verificationProgress } from '@/lib/verification'
import { cn, formatDateTime, formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ApplicantCard } from '@/components/shared/ApplicantCard'
import { VerificationPanel } from '@/components/shared/VerificationPanel'
import { ActivityLog } from '@/components/shared/ActivityLog'
import { ReasonDialog } from '@/components/shared/ReasonDialog'

export default function ManagerApplicationDetail() {
  const { id } = useParams()
  const { applications, getUser, managerApprove, managerReject, disburseLoan } = useStore()
  const [dialog, setDialog] = useState(null)
  const app = applications.find((a) => a.id === id)
  if (!app) return <Card><EmptyState icon={FileText} title="Application not found" action={<Button asChild><Link to="/manager/applications">Back</Link></Button>} /></Card>

  const agent = getUser(app.agentId)
  const creditBlocked = app.creditCheck && !creditOk(app)
  const canApprove = app.status === STATUS.AGENT_APPROVED && !creditBlocked
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
        <div className="lg:col-span-2">
          <Tabs defaultValue={app.status === STATUS.AGENT_APPROVED ? 'verify' : 'details'}>
            <TabsList>
              <TabsTrigger value="details">Application</TabsTrigger>
              <TabsTrigger value="verify">Agent verification</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="details"><ApplicantCard app={app} agent={agent} /></TabsContent>
            <TabsContent value="verify"><VerificationPanel app={app} editable={false} /></TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader><CardTitle>Complete application history</CardTitle></CardHeader>
                <CardContent><ActivityLog history={app.history} /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Final decision */}
          <Card className="overflow-hidden">
            <div className={cn('h-1', canApprove ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-border')} />
            <CardHeader>
              <CardTitle>Final decision</CardTitle>
              <CardDescription>Approval unlocks only after the agent verifies and approves.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {app.managerDecision ? (
                <ManagerDecision d={app.managerDecision} />
              ) : app.status === STATUS.AGENT_REJECTED ? (
                <div className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
                  <p className="flex items-center gap-2 font-bold"><XCircle className="size-5" /> Closed — rejected by agent</p>
                  <p className="mt-2">{app.agentDecision?.reason}</p>
                </div>
              ) : (
                <>
                  {app.agentDecision?.decision === 'recommended' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><BadgeCheck className="size-4" /> Verified & recommended by agent</p>
                      <p className="mt-2 flex gap-2 text-sm text-emerald-900"><Quote className="size-4 shrink-0 opacity-50" />{app.agentDecision.note || 'No note added.'}</p>
                      <p className="mt-2 text-xs text-emerald-700">{app.agentDecision.by} · {formatDateTime(app.agentDecision.at)}</p>
                    </div>
                  )}
                  {app.creditCheck && (
                    <div className={cn('flex items-center justify-between rounded-xl border px-4 py-3', creditBlocked ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50/60')}>
                      <span className="text-sm font-semibold">Credit score</span>
                      <span className="flex items-center gap-2 font-extrabold tabular">{app.creditCheck.score} <Badge variant={creditBand(app.creditCheck.score).tone}>{creditBand(app.creditCheck.score).label}</Badge></span>
                    </div>
                  )}
                  {!canApprove && (
                    <div className="flex items-start gap-3 rounded-xl border border-dashed p-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary"><Lock className="size-4 text-muted-foreground" /></span>
                      <div className="text-sm">
                        <p className="font-semibold">Approval locked</p>
                        <p className="text-muted-foreground">
                          {creditBlocked
                            ? `Credit score is below the minimum of ${MIN_CREDIT_SCORE}. This loan cannot be approved.`
                            : `${app.status === STATUS.UNASSIGNED ? 'Waiting for an agent in the area to accept it. ' : ''}The agent must check the credit score, verify all fields and documents, and approve before you can give final approval.`}
                        </p>
                      </div>
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

          {app.status === STATUS.UNASSIGNED && <AreaAgentsCard app={app} />}

          {(app.status === STATUS.APPROVED || app.status === STATUS.DISBURSED || app.bank) && (
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
          )}

          {agent && <AgentCard agent={agent} app={app} />}
        </div>
      </div>

      <DisburseDialog
        app={app}
        open={dialog === 'disburse'}
        onOpenChange={(o) => !o && setDialog(null)}
        onConfirm={(mode) => {
          const utr = disburseLoan(app.id, mode)
          toast.success(`${formatINR(app.amount)} sent`, { description: `To ${bankLabel(app.bank)} via ${mode} · UTR ${utr}` })
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
        onConfirm={(note) => {
          managerApprove(app.id, note)
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
        presets={['Debt-to-income ratio too high', 'Credit score below policy', 'Insufficient documentation', 'Policy limits exceeded']}
        onConfirm={(reason) => {
          managerReject(app.id, reason)
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
          <Button variant="success" onClick={() => onConfirm(valid)}><Send /> Send {formatINR(app.amount)}</Button>
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

function AgentCard({ agent, app }) {
  const { applications } = useStore()
  const load = applications.filter((a) => a.agentId === agent.id && [STATUS.ASSIGNED, STATUS.IN_VERIFICATION].includes(a.status)).length
  return (
    <Card>
      <CardHeader><CardTitle>Assigned agent</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Avatar name={agent.name} className="size-11" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.employeeCode} · {agent.area}</p>
          </div>
          <Badge variant={agent.active ? 'success' : 'slate'}>{agent.active ? 'Active' : 'Inactive'}</Badge>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Mini label="Distance" value={app.agentDistanceKm != null ? `${app.agentDistanceKm} km` : '—'} />
          <Mini label="Open cases" value={load} />
          <Mini label="Checks" value={`${verificationProgress(app).done}/${verificationProgress(app).total}`} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild><a href={`tel:${agent.mobile}`}><Phone /> Call</a></Button>
          <Button variant="outline" size="sm" className="flex-1" asChild><Link to={`/manager/agents/${agent.id}`}>View profile</Link></Button>
        </div>
      </CardContent>
    </Card>
  )
}

const Mini = ({ label, value }) => (
  <div className="rounded-lg bg-muted/70 px-2 py-2">
    <p className="text-sm font-extrabold tabular">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
)

/** Read-only: which agents can see this open request. Agents assign themselves — the manager does not. */
function AreaAgentsCard({ app }) {
  const { users } = useStore()
  const ranked = useMemo(() => rankAgents(users, app.location).filter((r) => r.distance <= ASSIGNMENT_RADIUS_KM), [users, app.location])
  const declined = Object.fromEntries((app.declinedBy || []).map((d) => [d.agentId, d]))
  const waiting = ranked.filter((r) => !declined[r.agent.id]).length

  return (
    <Card className="border-amber-300 ring-4 ring-amber-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Radio className="size-5 text-amber-600" /> Waiting for an agent</CardTitle>
        <CardDescription>Shared with active agents within {ASSIGNMENT_RADIUS_KM} km. The first one to accept takes this customer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {ranked.length === 0 ? (
          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">No active agent covers this location.</p>
            <p className="mt-1">Add or activate an agent near this address and they'll see the request right away.</p>
            <Button size="sm" className="mt-3" asChild><Link to="/manager/agents"><UserPlus /> Manage agents</Link></Button>
          </div>
        ) : (
          <>
            {ranked.map(({ agent, distance }) => {
              const d = declined[agent.id]
              return (
                <div key={agent.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <Avatar name={agent.name} className="size-8 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{agent.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{d ? `Declined${d.reason ? `: ${d.reason}` : ''}` : `${agent.area} · ${distance.toFixed(1)} km`}</p>
                  </div>
                  <Badge variant={d ? 'danger' : 'warning'}>{d ? 'Declined' : 'Notified'}</Badge>
                </div>
              )
            })}
            {waiting === 0 && <p className="rounded-lg bg-red-50 p-3 text-xs font-medium text-red-800">Every agent in this area declined. Add another agent nearby or reject the application.</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
