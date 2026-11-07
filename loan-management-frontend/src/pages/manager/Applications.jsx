import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useStore } from '@/lib/store'
import { STATUS, isApproved, isPending, isRejected } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { creditBand } from '@/lib/kyc'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { DataTable } from '@/components/shared/DataTable'

const FILTERS = {
  all: { label: 'All', fn: () => true },
  awaiting: { label: 'Awaiting approval', fn: (a) => a.status === STATUS.AGENT_APPROVED },
  unassigned: { label: 'Waiting for agent', fn: (a) => a.status === STATUS.UNASSIGNED },
  pending: { label: 'Pending', fn: (a) => isPending(a.status) },
  disburse: { label: 'To disburse', fn: (a) => a.status === STATUS.APPROVED },
  approved: { label: 'Approved', fn: (a) => isApproved(a.status) },
  rejected: { label: 'Rejected', fn: (a) => isRejected(a.status) },
}

function actionFor(a) {
  if (a.status === STATUS.AGENT_APPROVED) return { label: 'Review', variant: 'default' }
  if (a.status === STATUS.APPROVED) return { label: 'Disburse', variant: 'success' }
  return { label: 'View', variant: 'outline' }
}

export default function ManagerApplications() {
  const { applications, users, getUser } = useStore()
  const [params, setParams] = useSearchParams()
  const tab = FILTERS[params.get('status')] ? params.get('status') : 'all'
  const [q, setQ] = useState('')
  const [agentId, setAgentId] = useState('')
  const agents = users.filter((u) => u.role === 'agent')

  const sorted = useMemo(() => [...applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [applications])
  const rows = sorted
    .filter(FILTERS[tab].fn)
    .filter((a) => !agentId || a.agentId === agentId)
    .filter((a) => {
      const s = q.toLowerCase()
      return !s || [a.fullName, a.mobile, a.id, getUser(a.agentId)?.name || ''].some((v) => v.toLowerCase().includes(s))
    })

  return (
    <div>
      <PageHeader title="Application management" description="Review agent recommendations and make final loan decisions." />
      <Card>
        <div className="flex flex-col gap-3 border-b p-4">
          <Tabs value={tab} onValueChange={(v) => setParams(v === 'all' ? {} : { status: v })}>
            <TabsList>
              {Object.entries(FILTERS).map(([k, f]) => (
                <TabsTrigger key={k} value={k}>{f.label} <span className="text-xs text-muted-foreground">{applications.filter(f.fn).length}</span></TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={q} onChange={setQ} placeholder="Search customer, agent, ID…" />
            <NativeSelect value={agentId} onChange={(e) => setAgentId(e.target.value)} className="sm:w-52" aria-label="Filter by agent">
              <option value="">All agents</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </NativeSelect>
          </div>
        </div>
        <DataTable
          rows={rows}
          rowHref={(a) => `/manager/applications/${a.id}`}
          empty={<EmptyState icon={FileText} title="No applications found" description="Try a different filter." />}
          columns={[
            { key: 'c', header: 'Customer', cell: (a) => <div className="flex items-center gap-3"><Avatar name={a.fullName} className="size-8 text-[10px]" /><div><p className="font-semibold">{a.fullName}</p><p className="text-xs text-muted-foreground">{a.id} · {formatDate(a.createdAt)}</p></div></div> },
            { key: 'ag', header: 'Agent', cell: (a) => { const ag = getUser(a.agentId); return ag ? <div><p className="font-medium">{ag.name}</p><p className="text-xs text-muted-foreground">{ag.area}</p></div> : <span className="font-semibold text-amber-600">Not accepted yet</span> } },
            { key: 'amt', header: 'Loan amount', cell: (a) => <div><b className="tabular">{formatINR(a.amount)}</b><p className="text-xs text-muted-foreground">{a.tenure} months</p></div> },
            { key: 'cs', header: 'Credit', cell: (a) => (a.creditCheck ? <Badge variant={creditBand(a.creditCheck.score).tone}>{a.creditCheck.score}</Badge> : <span className="text-xs text-muted-foreground">—</span>) },
            { key: 'p', header: 'Purpose', cell: (a) => a.purpose },
            { key: 's', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
            { key: 'x', header: 'Action', headClassName: 'text-right', className: 'text-right', cell: (a) => { const x = actionFor(a); return <Button size="sm" variant={x.variant} asChild><Link to={`/manager/applications/${a.id}`}>{x.label}</Link></Button> } },
          ]}
          mobileCard={(a) => (
            <div className="flex items-start gap-3">
              <Avatar name={a.fullName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><p className="truncate font-semibold">{a.fullName}</p><StatusBadge status={a.status} /></div>
                <p className="text-sm"><b className="tabular">{formatINR(a.amount)}</b> · {a.tenure} months · {a.purpose}</p>
                <p className="text-xs text-muted-foreground">Agent: {getUser(a.agentId)?.name || 'Not accepted yet'} · {formatDate(a.createdAt)}</p>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  )
}
