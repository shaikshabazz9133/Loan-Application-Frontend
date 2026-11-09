import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, FileText, Plus, Sparkles, XCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import { isApproved, isPending, isRejected } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { emiOf } from '@/lib/kyc'
import { bankLabel } from '@/lib/bank'
import { STATUS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/PageHeader'
import { MiniProgress, StatusTimeline, buildSteps } from '@/components/shared/StatusTimeline'

export default function CustomerDashboard() {
  const { currentUser: me, applications, getUser } = useStore()
  const mine = applications.filter((a) => a.customerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const latest = mine[0]
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-white shadow-lift sm:p-8 animate-fade-up">
        <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-teal-500/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-teal-300">{greet},</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{me.name}</h1>
            <p className="mt-2 max-w-md text-sm text-slate-300">Need funds for something important? Apply in about 5 minutes with your PAN, Aadhaar and documents, and a verified agent near you will take it up.</p>
          </div>
          <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-white/90">
            <Link to="/customer/apply">
              <Plus /> Apply for a new loan
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total applications" value={mine.length} icon={FileText} tone="indigo" />
        <StatCard label="Pending" value={mine.filter((a) => isPending(a.status)).length} icon={Clock} tone="amber" style={{ animationDelay: '50ms' }} />
        <StatCard label="Approved" value={mine.filter((a) => isApproved(a.status)).length} icon={CheckCircle2} tone="emerald" style={{ animationDelay: '100ms' }} />
        <StatCard label="Rejected" value={mine.filter((a) => isRejected(a.status)).length} icon={XCircle} tone="rose" style={{ animationDelay: '150ms' }} />
      </div>

      {!latest ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="No applications yet"
            description="Start your first loan application. It only takes a few minutes."
            action={<Button asChild><Link to="/customer/apply"><Plus /> Apply now</Link></Button>}
          />
        </Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Recent application status</CardTitle>
                <CardDescription className="mt-1.5">{latest.id} · {latest.purpose}</CardDescription>
              </div>
              <StatusBadge status={latest.status} audience="customer" />
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-3 divide-x rounded-xl border bg-muted/40 text-center">
                {[
                  ['Loan amount', formatINR(latest.amount)],
                  ['Tenure', `${latest.tenure} months`],
                  ['Monthly EMI', formatINR(emiOf(latest))],
                ].map(([k, v]) => (
                  <div key={k} className="px-2 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p className="mt-0.5 text-base font-extrabold tabular sm:text-lg">{v}</p>
                  </div>
                ))}
              </div>
              {(latest.status === STATUS.DISBURSED || latest.status === STATUS.APPROVED) && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
                  <p>
                    <b>Loan approved.</b>{' '}
                    {latest.status === STATUS.DISBURSED
                      ? <>{formatINR(latest.disbursement.amount)} sent to <b>{bankLabel(latest.bank)}</b> on {formatDate(latest.disbursement.at)} · UTR {latest.disbursement.utr}</>
                      : <>{formatINR(latest.amount)} will be sent to <b>{bankLabel(latest.bank)}</b> shortly.</>}
                  </p>
                </div>
              )}
              <StatusTimeline steps={buildSteps(latest, getUser(latest.agentId)?.name)} />
              <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
                <Link to={`/customer/applications/${latest.id}`}>View full details <ArrowRight /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Your applications</CardTitle>
              <Link to="/customer/applications" className="text-sm font-semibold text-primary hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {mine.slice(0, 5).map((a) => (
                <Link key={a.id} to={`/customer/applications/${a.id}`} className="block rounded-xl border p-3.5 transition hover:border-primary/40 hover:bg-accent/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold tabular">{formatINR(a.amount)}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.tenure} months · EMI {formatINR(emiOf(a))}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.purpose} · {formatDate(a.createdAt)}</p>
                    </div>
                    <StatusBadge status={a.status} audience="customer" />
                  </div>
                  <div className="mt-3"><MiniProgress steps={buildSteps(a)} /></div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
