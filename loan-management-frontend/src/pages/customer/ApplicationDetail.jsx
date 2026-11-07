import { Link, useParams } from 'react-router-dom'
import { Briefcase, Cake, Calendar, CalendarClock, CreditCard, FileText, Fingerprint, Gauge, Mail, MapPin, Phone, User, Wallet } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatDate, formatINR } from '@/lib/utils'
import { INTEREST_RATE, ageFrom, creditBand, emiFor, maskAadhaar, maskPan, tenureLabel } from '@/lib/kyc'
import { DocumentList } from '@/components/shared/Documents'
import { DisbursementCard, LoanOutcomeBanner } from '@/components/shared/Disbursement'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { StatusTimeline, buildSteps } from '@/components/shared/StatusTimeline'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { MapView } from '@/components/shared/MapView'

export default function CustomerApplicationDetail() {
  const { id } = useParams()
  const { applications, currentUser: me, getUser } = useStore()
  const app = applications.find((a) => a.id === id && a.customerId === me.id)
  if (!app)
    return <Card><EmptyState icon={FileText} title="Application not found" action={<Button asChild><Link to="/customer/applications">Back to applications</Link></Button>} /></Card>

  const agent = getUser(app.agentId)

  const emi = emiFor(app.amount, app.tenure)
  const steps = buildSteps(app, agent?.name)
  const doneSteps = steps.filter((st) => st.state === 'complete').length
  const band = app.creditCheck ? creditBand(app.creditCheck.score) : null

  const summary = [
    ['Loan amount', formatINR(app.amount), app.purpose],
    ['Tenure', `${app.tenure} months`, app.tenure % 12 === 0 ? `${app.tenure / 12} year${app.tenure > 12 ? 's' : ''}` : `${(app.tenure / 12).toFixed(1)} years`],
    ['Monthly EMI', formatINR(emi), `${INTEREST_RATE}% p.a. indicative`],
    ['Total payable', formatINR(emi * app.tenure), `Interest ${formatINR(emi * app.tenure - app.amount)}`],
  ]

  return (
    <div>
      <PageHeader
        back={{ to: '/customer/applications', label: 'My applications' }}
        title={`Application ${app.id}`}
        description={`Submitted on ${formatDate(app.createdAt)} · ${app.purpose} loan`}
        actions={<StatusBadge status={app.status} audience="customer" className="px-3 py-1 text-sm" />}
      />

      <LoanOutcomeBanner app={app} />

      {/* Summary strip */}
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 p-5 text-white shadow-lift sm:p-6 animate-fade-up">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="relative grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.2fr)]">
          {summary.map(([k, v, sub]) => (
            <div key={k} className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-100">{k}</p>
              <p className="mt-1 truncate text-xl font-extrabold tabular sm:text-2xl">{v}</p>
              <p className="truncate text-xs text-teal-100/90">{sub}</p>
            </div>
          ))}
          <div className="col-span-2 min-w-0 rounded-xl bg-white/10 p-4 ring-1 ring-white/15 lg:col-span-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-100">Progress</p>
              <p className="text-sm font-bold tabular">{doneSteps} of {steps.length} steps</p>
            </div>
            <div className="mt-3 flex gap-1" aria-hidden="true">
              {steps.map((st) => (
                <span key={st.title} className={`h-1.5 flex-1 rounded-full ${st.state === 'complete' ? 'bg-white' : st.state === 'failed' ? 'bg-red-300' : st.state === 'current' ? 'bg-white/50' : 'bg-white/15'}`} />
              ))}
            </div>
            <p className="mt-2 truncate text-xs text-teal-100">{steps.find((st) => st.state === 'current' || st.state === 'failed')?.title || 'Completed'}</p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Loan application status</CardTitle></CardHeader>
            <CardContent><StatusTimeline steps={steps} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Application details</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <DetailSection
                title="Loan"
                items={[
                  ['Purpose', app.purpose, Briefcase],
                  ['Loan tenure', tenureLabel(app.tenure), CalendarClock],
                  ['Monthly income', formatINR(app.income), Wallet],
                  ['Employment', app.employment, Briefcase],
                  ['Credit score', band ? <span key="cs" className="inline-flex items-center gap-2 tabular">{app.creditCheck.score} <Badge variant={band.tone}>{band.label}</Badge></span> : 'Checked during verification', Gauge],
                  ['Applied on', formatDate(app.createdAt), Calendar],
                ]}
              />
              <DetailSection
                title="Personal & KYC"
                items={[
                  ['Full name', app.fullName, User],
                  ['Date of birth', `${formatDate(app.dob)} (${ageFrom(app.dob)} yrs)`, Cake],
                  ['Aadhaar', maskAadhaar(app.aadhaar), Fingerprint],
                  ['PAN', maskPan(app.pan), CreditCard],
                ]}
              />
              <DetailSection
                title="Contact & address"
                items={[
                  ['Mobile', app.mobile, Phone],
                  ['Email', app.email, Mail],
                  ['Address', `${app.address}, ${app.city} - ${app.pincode}`, MapPin],
                ]}
              />
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader><CardTitle>Your agent</CardTitle></CardHeader>
            <CardContent>
              {agent ? (
                <div className="flex items-center gap-3">
                  <Avatar name={agent.name} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{agent.name}</p>
                    <p className="truncate text-sm text-muted-foreground">{agent.area}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild><a href={`tel:${agent.mobile}`}><Phone /> Call</a></Button>
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Waiting for an agent in your area to accept your application.</p>
              )}
              <MapView
                className="mt-4 h-44"
                center={app.location}
                zoom={14}
                markers={[
                  { id: 'me', position: app.location, label: 'Your location', kind: 'primary' },
                  ...(agent ? [{ id: agent.id, position: agent.location, label: agent.name, kind: 'agent' }] : []),
                ]}
              />
            </CardContent>
          </Card>

          <DisbursementCard app={app} />

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Your documents</CardTitle>
              <Badge variant="slate">{Object.keys(app.documents || {}).length} files</Badge>
            </CardHeader>
            <CardContent><DocumentList app={app} /></CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function DetailSection({ title, items }) {
  return (
    <section>
      <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{title}</h4>
      <InfoGrid className="grid-cols-2 gap-x-4 xl:grid-cols-3" items={items} />
    </section>
  )
}
