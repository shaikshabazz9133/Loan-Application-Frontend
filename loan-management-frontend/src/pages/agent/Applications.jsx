import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ExternalLink, FileText, Inbox } from 'lucide-react'
import { useStore, openRequestsFor } from '@/lib/store'
import { STATUS } from '@/lib/constants'
import { cn, formatDate, formatINR } from '@/lib/utils'
import { emiFor } from '@/lib/kyc'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { SearchInput } from '@/components/shared/SearchInput'
import { DataTable } from '@/components/shared/DataTable'
import { googleMapsLink } from '@/components/shared/MapView'
import { OpenRequestCard, useOpenRequestActions } from '@/components/shared/OpenRequest'

const FILTERS = {
  all: { label: 'All', fn: () => true },
  pending: { label: 'To verify', fn: (a) => a.status === STATUS.ASSIGNED || a.status === STATUS.IN_VERIFICATION },
  recommended: { label: 'Approved by me', fn: (a) => a.agentDecision?.decision === 'recommended' },
  awaiting: { label: 'Awaiting manager', fn: (a) => a.status === STATUS.AGENT_APPROVED },
  rejected: { label: 'Rejected', fn: (a) => a.status === STATUS.AGENT_REJECTED },
}

export default function AgentApplications() {
  const { currentUser: me, applications } = useStore()
  const [params, setParams] = useSearchParams()
  const open = useMemo(() => openRequestsFor(me, applications).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [me, applications])
  const view = params.get('view') || (open.length ? 'open' : 'mine')
  const tab = FILTERS[params.get('status')] ? params.get('status') : 'all'
  const [q, setQ] = useState('')
  const { accept, decline, dialog } = useOpenRequestActions()

  const mine = useMemo(() => applications.filter((a) => a.agentId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [applications, me.id])
  const rows = mine.filter(FILTERS[tab].fn).filter((a) => {
    const s = q.toLowerCase()
    return !s || [a.fullName, a.mobile, a.email, a.id, a.purpose].some((v) => v.toLowerCase().includes(s))
  })

  const columns = [
    { key: 'name', header: 'Customer', cell: (a) => (
      <div className="flex items-center gap-3">
        <Avatar name={a.fullName} className="size-8 text-[10px]" />
        <div><p className="font-semibold">{a.fullName}</p><p className="text-xs text-muted-foreground">{a.id}</p></div>
      </div>
    ) },
    { key: 'contact', header: 'Mobile / Email', cell: (a) => <div><p>{a.mobile}</p><p className="text-xs text-muted-foreground">{a.email}</p></div> },
    { key: 'amount', header: 'Loan amount', cell: (a) => <span className="font-bold tabular">{formatINR(a.amount)}</span> },
    { key: 'tenure', header: 'Tenure', cell: (a) => <div><p className="font-semibold">{a.tenure} mo</p><p className="text-xs text-muted-foreground">EMI {formatINR(emiFor(a.amount, a.tenure))}</p></div> },
    { key: 'purpose', header: 'Purpose', cell: (a) => a.purpose },
    { key: 'income', header: 'Monthly income', cell: (a) => <span className="tabular">{formatINR(a.income)}</span> },
    { key: 'address', header: 'Address', className: 'max-w-[200px] truncate', cell: (a) => <span title={`${a.address}, ${a.city}`}>{a.address}, {a.city}</span> },
    { key: 'loc', header: 'Location', cell: (a) => (
      <a href={googleMapsLink(a.location)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
        {a.agentDistanceKm ?? '—'} km <ExternalLink className="size-3" />
      </a>
    ) },
    { key: 'date', header: 'Applied', cell: (a) => formatDate(a.createdAt) },
    { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
    { key: 'action', header: '', cell: (a) => { const todo = FILTERS.pending.fn(a); return <Button size="sm" variant={todo ? 'default' : 'outline'} asChild><Link to={`/agent/applications/${a.id}`}>{todo ? 'Verify' : 'View'}</Link></Button> } },
  ]

  return (
    <div>
      <PageHeader title="Customer applications" description={`Requests from customers within 2 km of ${me.area}. Accept one to unlock the customer's details.`} />

      <div className="mb-5 inline-flex rounded-xl bg-secondary p-1" role="tablist">
        {[
          ['open', 'Open requests in my area', open.length],
          ['mine', 'My accepted customers', mine.length],
        ].map(([k, label, n]) => (
          <button
            key={k}
            role="tab"
            aria-selected={view === k}
            onClick={() => setParams({ view: k })}
            className={cn('flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition', view === k ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {label}
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', k === 'open' && n ? 'bg-amber-500 text-white' : 'bg-background text-muted-foreground')}>{n}</span>
          </button>
        ))}
      </div>

      {view === 'open' ? (
        open.length === 0 ? (
          <Card><EmptyState icon={Inbox} title="No open requests" description="New loan applications from customers in your area will appear here. The first agent to accept a request gets it." /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {open.map((a, i) => <OpenRequestCard key={a.id} app={a} agent={me} onAccept={accept} onDecline={decline} style={{ animationDelay: `${i * 40}ms` }} />)}
          </div>
        )
      ) : (
        <Card>
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={tab} onValueChange={(v) => setParams(v === 'all' ? { view: 'mine' } : { view: 'mine', status: v })}>
              <TabsList>
                {Object.entries(FILTERS).map(([k, f]) => (
                  <TabsTrigger key={k} value={k}>{f.label} <span className="text-xs text-muted-foreground">{mine.filter(f.fn).length}</span></TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <SearchInput value={q} onChange={setQ} placeholder="Search name, mobile, ID…" />
          </div>
          <DataTable
            columns={columns}
            rows={rows}
            rowHref={(a) => `/agent/applications/${a.id}`}
            empty={<EmptyState icon={FileText} title="No applications found" description="Accept open requests in your area to see them here." />}
            mobileCard={(a) => (
              <div className="flex items-start gap-3">
                <Avatar name={a.fullName} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-semibold">{a.fullName}</p>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{a.id} · {a.mobile}</p>
                  <p className="mt-1.5 text-sm"><b className="tabular">{formatINR(a.amount)}</b> · {a.tenure} months · {a.purpose}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(a.createdAt)} · {a.agentDistanceKm ?? '—'} km away</p>
                </div>
              </div>
            )}
          />
        </Card>
      )}
      {dialog}
    </div>
  )
}
