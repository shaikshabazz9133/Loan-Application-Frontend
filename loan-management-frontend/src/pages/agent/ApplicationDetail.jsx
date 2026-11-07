import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, EyeOff, FileText, Hand, Info, IndianRupee, Lock, MapPin, Navigation, PlayCircle, ThumbsUp, UserX, X, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, openRequestsFor, inAgentArea } from '@/lib/store'
import { INTEREST_RATE, MIN_CREDIT_SCORE, creditBand, emiFor } from '@/lib/kyc'
import { creditOk, recommendBlocker, verificationProgress } from '@/lib/verification'
import { STATUS } from '@/lib/constants'
import { distanceKm, formatDateTime, formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ApplicantCard } from '@/components/shared/ApplicantCard'
import { VerificationPanel } from '@/components/shared/VerificationPanel'
import { ActivityLog } from '@/components/shared/ActivityLog'
import { ReasonDialog } from '@/components/shared/ReasonDialog'
import { MapView, googleMapsLink } from '@/components/shared/MapView'
import { useOpenRequestActions } from '@/components/shared/OpenRequest'

export default function AgentApplicationDetail() {
  const { id } = useParams()
  const { applications, currentUser: me, startVerification, setCheck, addComment, agentRecommend, agentReject, runCreditCheck } = useStore()
  const [dialog, setDialog] = useState(null)
  const [tab, setTab] = useState('details')
  const any = applications.find((a) => a.id === id)
  const app = any?.agentId === me.id ? any : null
  const openForMe = !app && any && openRequestsFor(me, applications).some((a) => a.id === id)

  if (openForMe) return <LimitedView app={any} me={me} />
  if (!app && any && inAgentArea(any, me) && any.agentId)
    return <Card><EmptyState icon={UserX} title="Accepted by another agent" description={`${any.id} was accepted by another agent in your area. Only that agent can view and verify this customer.`} action={<Button asChild><Link to="/agent/applications">Back to open requests</Link></Button>} /></Card>
  if (!app) return <Card><EmptyState icon={FileText} title="Application not found" description="It may have been reassigned to another agent." action={<Button asChild><Link to="/agent/applications">Back to applications</Link></Button>} /></Card>

  const editable = app.status === STATUS.ASSIGNED || app.status === STATUS.IN_VERIFICATION
  const blocker = recommendBlocker(app)
  const creditLow = app.creditCheck && !creditOk(app)
  const progress = verificationProgress(app)
  const emi = emiFor(app.amount, app.tenure)
  const lowCreditReason = creditLow ? `Low credit score (${app.creditCheck.score}). Minimum required is ${MIN_CREDIT_SCORE}.` : ''
  const runCredit = () => {
    const score = runCreditCheck(app.id)
    if (score < MIN_CREDIT_SCORE) toast.error(`Credit score ${score} — not eligible`, { description: `Below the minimum of ${MIN_CREDIT_SCORE}. Reject this application.` })
    else toast.success(`Credit score ${score} — eligible`, { description: 'Continue verifying fields and documents.' })
  }

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
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="details">Application</TabsTrigger>
              <TabsTrigger value="verify">Verification</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="details"><ApplicantCard app={app} agent={me} /></TabsContent>
            <TabsContent value="verify">
              <VerificationPanel
                app={app}
                editable={editable}
                onCheck={(k, v) => setCheck(app.id, k, v)}
                onComment={(t) => (addComment(app.id, t), toast.success('Comment added'))}
                onRunCredit={runCredit}
                onRejectCredit={() => setDialog('reject')}
              />
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader><CardTitle>Application history</CardTitle></CardHeader>
                <CardContent><ActivityLog history={app.history} /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-teal-500 via-indigo-500 to-violet-500" />
            <CardHeader>
              <CardTitle>Your decision</CardTitle>
              <CardDescription>Verify the customer, then recommend or reject.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 rounded-xl border p-3 text-sm">
                <StepRow done={!!app.creditCheck} bad={creditLow} label="Credit score" value={app.creditCheck ? `${app.creditCheck.score} · ${creditBand(app.creditCheck.score).label}` : 'Not checked'} />
                <StepRow done={progress.complete} label="Fields & documents" value={`${progress.done}/${progress.total} verified`} />
              </ul>

              {editable ? (
                <>
                  {blocker && (
                    <p className={`flex items-start gap-2 rounded-lg p-3 text-xs font-medium ${creditLow ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {blocker}
                    </p>
                  )}
                  {app.status === STATUS.ASSIGNED && !app.creditCheck ? (
                    <Button className="w-full" variant="soft" onClick={() => (startVerification(app.id), setTab('verify'), toast('Verification started'))}>
                      <PlayCircle /> Start verification
                    </Button>
                  ) : blocker && !creditLow ? (
                    <Button className="w-full" variant="soft" onClick={() => setTab('verify')}>
                      <PlayCircle /> Continue verification
                    </Button>
                  ) : null}
                  {creditLow ? (
                    <Button className="w-full" variant="destructive" size="lg" onClick={() => setDialog('reject')}>
                      <XCircle /> Reject for low credit score
                    </Button>
                  ) : (
                    <>
                      <Button className="w-full" variant="success" size="lg" disabled={!!blocker} onClick={() => setDialog('recommend')}>
                        <ThumbsUp /> Approve & recommend to manager
                      </Button>
                      <Button className="w-full" variant="outline" onClick={() => setDialog('reject')}>
                        <XCircle className="text-destructive" /> Reject application
                      </Button>
                    </>
                  )}
                  <p className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    <span>Your approval is a <b>recommendation</b>, not a final loan disbursement approval. The manager makes the final decision.</span>
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
                  ['Interest (indicative)', `${INTEREST_RATE}% p.a.`],
                  ['Total payable', formatINR(emi * app.tenure)],
                  ['Purpose', app.purpose],
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
        open={dialog === 'recommend'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Recommend for manager approval"
        description="The application will be sent to the manager for final approval."
        label="Recommendation note (optional)"
        placeholder="e.g. Customer verified, stable income, low risk."
        confirmLabel="Send recommendation"
        variant="success"
        presets={['All documents verified. Low risk.', 'Stable salaried income, address confirmed.']}
        onConfirm={(note) => {
          agentRecommend(app.id, note)
          toast.success('Recommended to manager', { description: `${app.id} is now awaiting manager approval.` })
        }}
      />
      <ReasonDialog
        open={dialog === 'reject'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Reject application"
        description="The customer will be notified that their application was not approved."
        label="Rejection reason"
        placeholder="Explain why this application is being rejected…"
        confirmLabel="Reject application"
        variant="destructive"
        required
        initialText={lowCreditReason}
        presets={[...(creditLow ? [lowCreditReason] : []), 'Income could not be verified', 'Document mismatch', 'Customer unreachable', 'EMI exceeds 50% of income']}
        onConfirm={(reason) => {
          agentReject(app.id, reason)
          toast.error('Application rejected', { description: app.id })
        }}
      />
    </div>
  )
}

function StepRow({ done, bad, label, value }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className={`flex size-5 items-center justify-center rounded-full ${bad ? 'bg-destructive text-white' : done ? 'bg-success text-white' : 'bg-secondary text-muted-foreground'}`}>
        {bad ? <X className="size-3" strokeWidth={3} /> : done ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3" />}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      <span className={`text-xs font-semibold tabular ${bad ? 'text-destructive' : 'text-muted-foreground'}`}>{value}</span>
    </li>
  )
}

function DecisionSummary({ app }) {
  const d = app.agentDecision
  if (!d) return null
  const rec = d.decision === 'recommended'
  return (
    <div className={`rounded-xl p-4 ${rec ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
      <p className="flex items-center gap-2 font-bold">
        {rec ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
        {rec ? 'You recommended this application' : 'You rejected this application'}
      </p>
      <p className="mt-2 text-sm">{rec ? d.note || 'No note added.' : d.reason}</p>
      <p className="mt-2 text-xs opacity-70">{formatDateTime(d.at)}</p>
      {rec && (
        <p className="mt-3 border-t border-emerald-200 pt-3 text-sm font-semibold">
          Manager decision:{' '}
          {app.status === STATUS.DISBURSED ? 'Approved & disbursed ✅' : app.status === STATUS.APPROVED ? 'Approved ✅' : app.status === STATUS.REJECTED ? `Rejected — ${app.managerDecision?.reason}` : 'Pending review'}
        </p>
      )}
    </div>
  )
}

/** Before accepting, an agent only sees the loan amount, address and location. */
function LimitedView({ app, me }) {
  const navigate = useNavigate()
  const { accept, decline, dialog } = useOpenRequestActions({ afterDecline: () => navigate('/agent/applications?view=open') })
  const dist = distanceKm(app.location, me.location)
  const others = app.declinedBy?.length || 0
  return (
    <div>
      <PageHeader
        back={{ to: '/agent/applications?view=open', label: 'Open requests' }}
        title={`Open request ${app.id}`}
        description={`Posted ${formatDateTime(app.createdAt)}`}
        actions={<StatusBadge status={app.status} className="px-3 py-1 text-sm" />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request summary</CardTitle>
            <CardDescription>Only the loan amount, address and location are shown until you accept.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Fact icon={IndianRupee} label="Loan amount" value={formatINR(app.amount)} big />
              <Fact icon={MapPin} label="Address" value={`${app.address}, ${app.city} - ${app.pincode}`} className="sm:col-span-2" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/70 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 font-semibold"><Navigation className="size-4 text-primary" />{dist.toFixed(2)} km from your location</span>
              <a href={googleMapsLink(app.location)} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline tabular">{app.location.lat.toFixed(5)}, {app.location.lng.toFixed(5)}</a>
            </div>
            <MapView className="h-72" center={app.location} radiusKm={2} markers={[{ id: 'c', position: app.location, label: 'Customer', kind: 'primary' }, { id: 'me', position: me.location, label: 'You', kind: 'agent' }]} />
            <div className="grid gap-2 sm:grid-cols-3">
              {['Customer name & contact', 'Income & employment', 'Verification & history'].map((t) => (
                <div key={t} className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs font-semibold text-muted-foreground">
                  <Lock className="size-3.5" /> {t}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden lg:sticky lg:top-24 lg:self-start">
          <div className="h-1 bg-gradient-to-r from-amber-400 to-teal-500" />
          <CardHeader>
            <CardTitle>Take this customer?</CardTitle>
            <CardDescription>The first agent in this area to accept gets the customer. After that, only they can see the details and verify.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" size="lg" onClick={() => accept(app)}><Hand /> Accept & assign to me</Button>
            <Button className="w-full" variant="outline" onClick={() => decline(app)}><X className="text-destructive" /> Decline</Button>
            <p className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
              <EyeOff className="mt-0.5 size-3.5 shrink-0" />
              <span>Declining hides this request from you only. {others ? `${others} other agent${others > 1 ? 's have' : ' has'} declined it.` : 'Other agents can still accept it.'}</span>
            </p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="size-3.5" /> Posted {formatDateTime(app.createdAt)}</p>
          </CardContent>
        </Card>
      </div>
      {dialog}
    </div>
  )
}

function Fact({ icon: Icon, label, value, big, className }) {
  return (
    <div className={`rounded-xl border p-4 ${className || ''}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Icon className="size-3.5" /> {label}</p>
      <p className={big ? 'mt-1 text-2xl font-extrabold tabular' : 'mt-1 text-sm font-semibold'}>{value}</p>
    </div>
  )
}
