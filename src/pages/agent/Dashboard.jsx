import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText, Hourglass, Inbox, ShieldCheck, XCircle } from 'lucide-react'
import { useStore, openRequestsFor } from '@/lib/store'
import { STATUS } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { MapView } from '@/components/shared/MapView'
import { OpenRequestCard, useOpenRequestActions } from '@/components/shared/OpenRequest'

export default function AgentDashboard() {
  const { currentUser: me, applications } = useStore()
  const navigate = useNavigate()
  const { accept, decline, dialog } = useOpenRequestActions()
  const mine = applications.filter((a) => a.agentId === me.id)
  const open = openRequestsFor(me, applications).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const count = (fn) => mine.filter(fn).length
  const go = (q) => navigate(`/agent/applications?${q}`)

  const todo = mine
    .filter((a) => a.status === STATUS.ASSIGNED || a.status === STATUS.IN_VERIFICATION)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const stats = [
    { label: 'New requests in my area', value: open.length, icon: Inbox, tone: 'amber', onClick: () => go('view=open') },
    { label: 'Total assigned to me', value: mine.length, icon: FileText, tone: 'indigo', onClick: () => go('view=mine') },
    { label: 'Pending verification', value: todo.length, icon: ClipboardCheck, tone: 'violet', onClick: () => go('view=mine&status=pending') },
    { label: 'Approved by me', value: count((a) => a.agentDecision?.decision === 'recommended'), icon: CheckCircle2, tone: 'emerald', onClick: () => go('view=mine&status=recommended') },
    { label: 'Rejected by me', value: count((a) => a.status === STATUS.AGENT_REJECTED), icon: XCircle, tone: 'rose', onClick: () => go('view=mine&status=rejected') },
    { label: 'Awaiting manager review', value: count((a) => a.status === STATUS.AGENT_APPROVED), icon: Hourglass, tone: 'sky', onClick: () => go('view=mine&status=awaiting') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${me.name.split(' ')[0]} 👋`} description={`${me.area} · ${me.employeeCode} · You see customers within 2 km of your location.`} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s, i) => <StatCard key={s.label} {...s} style={{ animationDelay: `${i * 40}ms` }} className="flex-col gap-3" />)}
      </div>

      {open.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">New requests in {me.area}</h2>
              <p className="text-sm text-muted-foreground">First agent to accept gets the customer.</p>
            </div>
            {open.length > 3 && <Button variant="ghost" size="sm" asChild><Link to="/agent/applications?view=open">View all {open.length} <ArrowRight /></Link></Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {open.slice(0, 3).map((a, i) => <OpenRequestCard key={a.id} app={a} agent={me} onAccept={accept} onDecline={decline} style={{ animationDelay: `${i * 40}ms` }} />)}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>My customers to verify</CardTitle>
              <CardDescription className="mt-1.5">Oldest first.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild><Link to="/agent/applications?view=mine">View all <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {todo.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="All caught up!" description="Accept a new request from your area to start verifying." />
            ) : (
              todo.slice(0, 6).map((a) => (
                <Link key={a.id} to={`/agent/applications/${a.id}`} className="flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-accent/40">
                  <Avatar name={a.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.id} · {a.tenure} months · {a.purpose} · {formatDate(a.createdAt)}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="font-bold tabular">{formatINR(a.amount)}</p>
                    <p className="text-xs text-muted-foreground">{a.agentDistanceKm ?? '—'} km away</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My area</CardTitle>
            <CardDescription>2 km around your location · amber pins are open requests</CardDescription>
          </CardHeader>
          <CardContent>
            <MapView
              className="h-72"
              center={me.location}
              radiusKm={2}
              markers={[
                { id: 'me', position: me.location, label: 'You', kind: 'agent' },
                ...todo.map((a) => ({ id: a.id, position: a.location, label: `${a.fullName} · ${formatINR(a.amount)}`, kind: 'primary' })),
                ...open.map((a) => ({ id: a.id, position: a.location, label: `Open · ${formatINR(a.amount)}`, kind: 'warning' })),
              ]}
            />
          </CardContent>
        </Card>
      </div>
      {dialog}
    </div>
  )
}
