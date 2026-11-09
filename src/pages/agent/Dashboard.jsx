import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ClipboardCheck, Hourglass, Inbox, ShieldCheck, XCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import { STATUS } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { OpenRequestCard, useAcceptApplication } from '@/components/shared/OpenRequest'

export default function AgentDashboard() {
  const { currentUser: me, applications } = useStore()
  const navigate = useNavigate()
  const { accept, busy } = useAcceptApplication()
  const open = applications.filter((a) => a.status === STATUS.UNASSIGNED)
  const mine = applications.filter((a) => a.agentId === me.id)
  const todo = mine.filter((a) => a.status === STATUS.ASSIGNED).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const count = (status) => mine.filter((a) => a.status === status).length
  const go = (q) => navigate(`/agent/applications?${q}`)

  const stats = [
    { label: 'Open applications', value: open.length, icon: Inbox, tone: 'amber', onClick: () => go('view=open') },
    { label: 'To review', value: todo.length, icon: ClipboardCheck, tone: 'violet', onClick: () => go('view=mine&status=pending') },
    { label: 'Waiting for manager', value: count(STATUS.AGENT_APPROVED), icon: Hourglass, tone: 'sky', onClick: () => go('view=mine&status=awaiting') },
    { label: 'Approved by me', value: mine.filter((a) => a.agentDecision?.decision === 'recommended').length, icon: CheckCircle2, tone: 'emerald', onClick: () => go('view=mine&status=recommended') },
    { label: 'Rejected by me', value: count(STATUS.AGENT_REJECTED), icon: XCircle, tone: 'rose', onClick: () => go('view=mine&status=rejected') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${me.name.split(' ')[0]} 👋`} description="Accept an open application, check the details and documents, then approve or reject it." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {stats.map((s, i) => <StatCard key={s.label} {...s} style={{ animationDelay: `${i * 40}ms` }} className="flex-col gap-3" />)}
      </div>

      {open.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">New applications</h2>
              <p className="text-sm text-muted-foreground">The first agent to accept takes the application.</p>
            </div>
            {open.length > 3 && <Button variant="ghost" size="sm" asChild><Link to="/agent/applications?view=open">View all {open.length} <ArrowRight /></Link></Button>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {open.slice(0, 3).map((a, i) => <OpenRequestCard key={a.id} app={a} onAccept={accept} busy={busy} style={{ animationDelay: `${i * 40}ms` }} />)}
          </div>
        </section>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>My applications to review</CardTitle>
            <CardDescription className="mt-1.5">Oldest first.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild><Link to="/agent/applications?view=mine">View all <ArrowRight /></Link></Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {todo.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="All caught up!" description="Accept an open application to start reviewing." />
          ) : (
            todo.slice(0, 6).map((a) => (
              <Link key={a.id} to={`/agent/applications/${a.id}`} className="flex items-center gap-3 rounded-xl border p-3 transition hover:border-primary/40 hover:bg-accent/40">
                <Avatar name={a.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.id} · {a.tenure} months · {a.purpose} · {formatDate(a.createdAt)}</p>
                </div>
                <p className="hidden font-bold tabular sm:block">{formatINR(a.amount)}</p>
                <StatusBadge status={a.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
