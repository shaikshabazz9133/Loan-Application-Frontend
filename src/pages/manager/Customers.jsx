import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { isApproved, isPending, isRejected } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/input'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { DataTable } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/badge'

const FILTERS = {
  all: ['All customers', () => true],
  active: ['With pending application', (s) => s.pending > 0],
  approved: ['With approved loan', (s) => s.approved > 0],
  rejected: ['With rejected application', (s) => s.rejected > 0],
  none: ['No applications', (s) => s.total === 0],
}

export default function Customers() {
  const { users, applications } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')

  const customers = useMemo(
    () =>
      users
        .filter((u) => u.role === 'customer')
        .map((c) => {
          const apps = applications.filter((a) => a.customerId === c.id)
          return {
            ...c,
            stats: {
              total: apps.length,
              pending: apps.filter((a) => isPending(a.status)).length,
              approved: apps.filter((a) => isApproved(a.status)).length,
              rejected: apps.filter((a) => isRejected(a.status)).length,
              borrowed: apps.filter((a) => isApproved(a.status)).reduce((s, a) => s + a.amount, 0),
            },
          }
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [users, applications]
  )

  const rows = customers
    .filter((c) => FILTERS[filter][1](c.stats))
    .filter((c) => {
      const s = q.toLowerCase()
      return !s || [c.name, c.email, c.mobile].some((v) => v.toLowerCase().includes(s))
    })

  return (
    <div>
      <PageHeader title="Customers" description={`${customers.length} registered customers`} />
      <Card>
        <div className="flex flex-col gap-2 border-b p-4 sm:flex-row">
          <SearchInput value={q} onChange={setQ} placeholder="Search name, email, mobile…" />
          <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:w-60" aria-label="Filter customers">
            {Object.entries(FILTERS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </NativeSelect>
        </div>
        <DataTable
          rows={rows}
          rowHref={(c) => `/manager/customers/${c.id}`}
          empty={<EmptyState icon={Users} title="No customers found" />}
          columns={[
            { key: 'n', header: 'Customer', cell: (c) => <div className="flex items-center gap-3"><Avatar name={c.name} className="size-8 text-[10px]" /><div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></div></div> },
            { key: 'm', header: 'Mobile', cell: (c) => c.mobile },
            { key: 't', header: 'Applications', cell: (c) => (
              <div className="flex gap-1.5">
                <Badge variant="slate">{c.stats.total} total</Badge>
                {c.stats.pending > 0 && <Badge variant="warning">{c.stats.pending} pending</Badge>}
                {c.stats.approved > 0 && <Badge variant="success">{c.stats.approved} approved</Badge>}
              </div>
            ) },
            { key: 'b', header: 'Approved amount', cell: (c) => <b className="tabular">{formatINR(c.stats.borrowed)}</b> },
            { key: 'd', header: 'Joined', cell: (c) => formatDate(c.createdAt) },
            { key: 'x', header: '', className: 'text-right', cell: (c) => <Button size="sm" variant="outline" asChild><Link to={`/manager/customers/${c.id}`}>View</Link></Button> },
          ]}
          mobileCard={(c) => (
            <div className="flex items-center gap-3">
              <Avatar name={c.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.mobile} · {c.stats.total} applications</p>
              </div>
              <b className="text-sm tabular">{formatINR(c.stats.borrowed)}</b>
            </div>
          )}
        />
      </Card>
    </div>
  )
}
