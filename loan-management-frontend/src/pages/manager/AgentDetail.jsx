import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Briefcase, Calendar, CheckCircle2, Clock, FileText, Hash, Mail, MapPin, Pencil, Phone, ThumbsUp, Users, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { formatDate, formatINR } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/misc'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable } from '@/components/shared/DataTable'
import { InfoGrid } from '@/components/shared/InfoGrid'
import { MapView } from '@/components/shared/MapView'
import { AgentFormDialog } from './AgentFormDialog'
import { agentStats } from './Agents'

export default function AgentDetail() {
  const { id } = useParams()
  const { getUser, applications, setAgentActive } = useStore()
  const [editOpen, setEditOpen] = useState(false)
  const agent = getUser(id)
  if (!agent || agent.role !== 'agent') return <Card><EmptyState icon={Briefcase} title="Agent not found" action={<Button asChild><Link to="/manager/agents">Back</Link></Button>} /></Card>

  const s = agentStats(agent.id, applications)
  const apps = applications.filter((a) => a.agentId === agent.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const decided = s.recommended + s.rejected
  const decisionRate = s.total ? Math.round((decided / s.total) * 100) : 0
  const recRate = decided ? Math.round((s.recommended / decided) * 100) : 0
  const managerAgreed = s.recommended ? Math.round((s.approved / s.recommended) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ to: '/manager/agents', label: 'Agents' }}
        title="Agent details"
        actions={
          <>
            <label className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-semibold">
              <Switch checked={agent.active} onCheckedChange={(v) => { const n = setAgentActive(agent.id, v); toast.success(`${agent.name} ${v ? 'activated' : 'deactivated'}`, n ? { description: `${n} unfinished application${n > 1 ? 's' : ''} returned to open requests.` } : undefined) }} />
              {agent.active ? 'Active' : 'Inactive'}
            </label>
            <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar name={agent.name} className="size-16 text-lg" />
              <div>
                <p className="text-xl font-extrabold">{agent.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant={agent.active ? 'success' : 'slate'} dot>{agent.active ? 'Active' : 'Inactive'}</Badge>
                  <span className="text-sm text-muted-foreground">{agent.area}, {agent.city}</span>
                </div>
              </div>
            </div>
            <InfoGrid
              className="mt-6 border-t pt-6 md:grid-cols-3"
              items={[
                ['Employee code', agent.employeeCode, Hash],
                ['Email', agent.email, Mail],
                ['Mobile', agent.mobile, Phone],
                ['Operating area', agent.area, MapPin],
                ['Coordinates', `${agent.location.lat.toFixed(4)}, ${agent.location.lng.toFixed(4)}`, MapPin],
                ['Joined', formatDate(agent.createdAt), Calendar],
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Coverage</CardTitle><CardDescription>2 km radius & assigned customers</CardDescription></CardHeader>
          <CardContent>
            <MapView
              className="h-56"
              center={agent.location}
              radiusKm={2}
              markers={[{ id: 'a', position: agent.location, label: agent.name, kind: 'agent' }, ...apps.map((a) => ({ id: a.id, position: a.location, label: a.fullName, kind: 'primary' }))]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Assigned" value={s.total} icon={FileText} tone="indigo" />
        <StatCard label="Customers" value={s.customers} icon={Users} tone="sky" />
        <StatCard label="Open" value={s.open} icon={Clock} tone="amber" />
        <StatCard label="Recommended" value={s.recommended} icon={ThumbsUp} tone="emerald" />
        <StatCard label="Rejected" value={s.rejected} icon={XCircle} tone="rose" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Performance</CardTitle><CardDescription>Based on all assigned applications</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <Metric label="Applications processed" value={decisionRate} hint={`${decided} of ${s.total} decided`} />
            <Metric label="Recommendation rate" value={recRate} hint={`${s.recommended} recommended, ${s.rejected} rejected`} />
            <Metric label="Manager agreement" value={managerAgreed} hint={`${s.approved} of ${s.recommended} recommendations approved`} icon={CheckCircle2} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Assigned customers</CardTitle></CardHeader>
          <div className="border-t">
            <DataTable
              rows={apps}
              rowHref={(a) => `/manager/applications/${a.id}`}
              empty={<EmptyState icon={Users} title="No customers assigned yet" />}
              columns={[
                { key: 'c', header: 'Customer', cell: (a) => <div className="flex items-center gap-2.5"><Avatar name={a.fullName} className="size-8 text-[10px]" /><div><p className="font-semibold">{a.fullName}</p><p className="text-xs text-muted-foreground">{a.mobile}</p></div></div> },
                { key: 'amt', header: 'Amount', cell: (a) => <b className="tabular">{formatINR(a.amount)}</b> },
                { key: 'd', header: 'Distance', cell: (a) => `${a.agentDistanceKm ?? '—'} km` },
                { key: 'dt', header: 'Applied', cell: (a) => formatDate(a.createdAt) },
                { key: 's', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
              ]}
              mobileCard={(a) => (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-semibold">{a.fullName}</p><p className="text-xs text-muted-foreground">{formatINR(a.amount)} · {formatDate(a.createdAt)}</p></div>
                  <StatusBadge status={a.status} />
                </div>
              )}
            />
          </div>
        </Card>
      </div>

      <AgentFormDialog open={editOpen} onOpenChange={setEditOpen} agent={agent} />
    </div>
  )
}

function Metric({ label, value, hint }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-lg font-extrabold tabular">{value}%</p>
      </div>
      <Progress value={value} />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
