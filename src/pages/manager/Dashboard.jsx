import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowRight, Landmark, Briefcase, CheckCircle2, Clock, FileText, Users, XCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import { STATUS, isApproved, isPending, isRejected } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { AXIS_TICK, ChartTooltip, GRID, Legend, SERIES, STATUS_COLOR } from '@/components/shared/charts'

export default function ManagerDashboard() {
  const { users, applications } = useStore()
  const navigate = useNavigate()
  const customers = users.filter((u) => u.role === 'customer')
  const agents = users.filter((u) => u.role === 'agent')
  const awaiting = applications.filter((a) => a.status === STATUS.AGENT_APPROVED)
  const unassigned = applications.filter((a) => a.status === STATUS.UNASSIGNED)
  const toDisburse = applications.filter((a) => a.status === STATUS.APPROVED)
  const disbursedTotal = applications.filter((a) => a.disbursement).reduce((s, a) => s + a.disbursement.amount, 0)

  const monthly = useMemo(() => {
    const months = []
    const d = new Date()
    d.setDate(1)
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
      months.push({ ym: `${m.getFullYear()}-${m.getMonth()}`, label: m.toLocaleString('en-IN', { month: 'short' }), Applications: 0 })
    }
    applications.forEach((a) => {
      const c = new Date(a.createdAt)
      const row = months.find((m) => m.ym === `${c.getFullYear()}-${c.getMonth()}`)
      if (row) row.Applications++
    })
    return months
  }, [applications])

  const outcome = [
    { name: 'Approved', value: applications.filter((a) => isApproved(a.status)).length, color: STATUS_COLOR.good },
    { name: 'Rejected', value: applications.filter((a) => isRejected(a.status)).length, color: STATUS_COLOR.critical },
    { name: 'In progress', value: applications.filter((a) => isPending(a.status)).length, color: STATUS_COLOR.neutral },
  ]
  const decided = outcome[0].value + outcome[1].value
  const approvalRate = decided ? Math.round((outcome[0].value / decided) * 100) : 0

  const performance = agents
    .map((ag) => {
      const mine = applications.filter((a) => a.agentId === ag.id)
      return {
        name: ag.name.split(' ')[0],
        Recommended: mine.filter((a) => a.agentDecision?.decision === 'recommended').length,
        Rejected: mine.filter((a) => a.status === STATUS.AGENT_REJECTED).length,
        'In progress': mine.filter((a) => a.status === STATUS.ASSIGNED).length,
      }
    })
    .sort((a, b) => b.Recommended + b.Rejected + b['In progress'] - (a.Recommended + a.Rejected + a['In progress']))

  const recent = [...applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader title="Manager dashboard" description="Overview of customers, agents and loan applications." />

      {(awaiting.length > 0 || unassigned.length > 0 || toDisburse.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 animate-fade-up">
          {awaiting.length > 0 && (
            <Link to="/manager/applications?status=awaiting" className="group flex items-center gap-4 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-card p-4 transition hover:shadow-lift">
              <span className="flex size-11 items-center justify-center rounded-xl bg-sky-600 text-white"><CheckCircle2 className="size-5" /></span>
              <div className="flex-1">
                <p className="font-bold">{awaiting.length} awaiting your approval</p>
                <p className="text-sm text-muted-foreground">Verified & recommended by agents</p>
              </div>
              <ArrowRight className="size-5 text-sky-700 transition group-hover:translate-x-1" />
            </Link>
          )}
          {toDisburse.length > 0 && (
            <Link to="/manager/applications?status=disburse" className="group flex items-center gap-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-card p-4 transition hover:shadow-lift">
              <span className="flex size-11 items-center justify-center rounded-xl bg-success text-white"><Landmark className="size-5" /></span>
              <div className="flex-1">
                <p className="font-bold">{toDisburse.length} approved, ready to disburse</p>
                <p className="text-sm text-muted-foreground">{formatINR(toDisburse.reduce((s, a) => s + a.amount, 0))} to send to customers</p>
              </div>
              <ArrowRight className="size-5 text-emerald-700 transition group-hover:translate-x-1" />
            </Link>
          )}
          {unassigned.length > 0 && (
            <Link to="/manager/applications?status=unassigned" className="group flex items-center gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-card p-4 transition hover:shadow-lift">
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500 text-white"><AlertTriangle className="size-5" /></span>
              <div className="flex-1">
                <p className="font-bold">{unassigned.length} waiting for an agent</p>
                <p className="text-sm text-muted-foreground">New requests not yet accepted by an area agent</p>
              </div>
              <ArrowRight className="size-5 text-amber-700 transition group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'Total customers', value: customers.length, icon: Users, tone: 'sky', onClick: () => navigate('/manager/customers') },
          { label: 'Total agents', value: agents.length, hint: `${agents.filter((a) => a.active).length} active`, icon: Briefcase, tone: 'indigo', onClick: () => navigate('/manager/agents') },
          { label: 'Total applications', value: applications.length, icon: FileText, tone: 'teal', onClick: () => navigate('/manager/applications') },
          { label: 'Pending', value: applications.filter((a) => isPending(a.status)).length, hint: 'Awaiting review', icon: Clock, tone: 'amber', onClick: () => navigate('/manager/applications?status=pending') },
          { label: 'Approved', value: outcome[0].value, hint: `${formatINR(disbursedTotal)} disbursed`, icon: CheckCircle2, tone: 'emerald', onClick: () => navigate('/manager/applications?status=approved') },
          { label: 'Rejected', value: outcome[1].value, icon: XCircle, tone: 'rose', onClick: () => navigate('/manager/applications?status=rejected') },
        ].map((s, i) => (
          <StatCard key={s.label} {...s} style={{ animationDelay: `${i * 40}ms` }} className="flex-col gap-3" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Monthly applications</CardTitle>
            <CardDescription>Applications received in the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                <Tooltip cursor={{ fill: 'rgba(15,23,42,.04)' }} content={<ChartTooltip />} />
                <Bar dataKey="Applications" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Approval vs rejection</CardTitle>
            <CardDescription>All applications by outcome</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie data={outcome} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="#fff" strokeWidth={2} cornerRadius={4} isAnimationActive={false}>
                    {outcome.map((o) => <Cell key={o.name} fill={o.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-extrabold tabular">{approvalRate}%</p>
                <p className="text-xs font-medium text-muted-foreground">approval rate</p>
              </div>
            </div>
            <div className="mt-3 flex justify-center"><Legend items={outcome.map((o) => ({ label: o.name, color: o.color, value: o.value }))} /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Agent performance</CardTitle>
            <CardDescription>Applications handled by each agent</CardDescription>
          </CardHeader>
          <CardContent>
            <Legend items={[{ label: 'Recommended', color: SERIES[0] }, { label: 'Rejected', color: SERIES[1] }, { label: 'In progress', color: SERIES[2] }]} />
            <div className="mt-3" style={{ height: Math.max(220, performance.length * 46) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid horizontal={false} stroke={GRID} />
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={AXIS_TICK} />
                  <YAxis type="category" dataKey="name" width={64} tickLine={false} axisLine={false} tick={{ ...AXIS_TICK, fill: '#374151', fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'rgba(15,23,42,.04)' }} content={<ChartTooltip />} />
                  <Bar dataKey="Recommended" stackId="a" fill={SERIES[0]} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
                  <Bar dataKey="Rejected" stackId="a" fill={SERIES[1]} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
                  <Bar dataKey="In progress" stackId="a" fill={SERIES[2]} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent applications</CardTitle>
              <CardDescription className="mt-1.5">Latest loan requests across all agents</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild><Link to="/manager/applications">View all <ArrowRight /></Link></Button>
          </CardHeader>
          <div className="border-t">
            <DataTable
              rows={recent}
              rowHref={(a) => `/manager/applications/${a.id}`}
              columns={[
                { key: 'c', header: 'Customer', cell: (a) => <div className="flex items-center gap-2.5"><Avatar name={a.fullName} className="size-8 text-[10px]" /><div><p className="font-semibold">{a.fullName}</p><p className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</p></div></div> },
                { key: 'ag', header: 'Agent', cell: (a) => a.agentName || <span className="text-amber-600">Not accepted yet</span> },
                { key: 'amt', header: 'Amount', cell: (a) => <b className="tabular">{formatINR(a.amount)}</b> },
                { key: 's', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
              ]}
              mobileCard={(a) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-semibold">{a.fullName}</p><p className="text-xs text-muted-foreground">{formatINR(a.amount)} · {a.agentName || 'Not accepted yet'}</p></div>
                  <StatusBadge status={a.status} />
                </div>
              )}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
