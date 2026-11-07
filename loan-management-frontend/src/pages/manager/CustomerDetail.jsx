import { Link, useParams } from 'react-router-dom'
import { Calendar, CheckCircle2, Clock, FileText, Mail, Phone, XCircle } from 'lucide-react'
import { useStore } from '@/lib/store'
import { isApproved, isPending, isRejected } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DataTable } from '@/components/shared/DataTable'
import { InfoGrid } from '@/components/shared/InfoGrid'

export default function CustomerDetail() {
  const { id } = useParams()
  const { getUser, applications } = useStore()
  const c = getUser(id)
  if (!c || c.role !== 'customer') return <Card><EmptyState icon={FileText} title="Customer not found" action={<Button asChild><Link to="/manager/customers">Back</Link></Button>} /></Card>
  const apps = applications.filter((a) => a.customerId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className="space-y-6">
      <PageHeader back={{ to: '/manager/customers', label: 'Customers' }} title="Customer details" />
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Avatar name={c.name} className="size-16 text-lg" />
            <div>
              <p className="text-xl font-extrabold">{c.name}</p>
              <p className="text-sm text-muted-foreground">Customer since {formatDate(c.createdAt)}</p>
            </div>
          </div>
          <InfoGrid className="flex-1 md:grid-cols-3 md:border-l md:pl-6" items={[['Email', c.email, Mail], ['Mobile', c.mobile, Phone], ['Joined', formatDate(c.createdAt), Calendar]]} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Applications" value={apps.length} icon={FileText} tone="indigo" />
        <StatCard label="Pending" value={apps.filter((a) => isPending(a.status)).length} icon={Clock} tone="amber" />
        <StatCard label="Approved" value={apps.filter((a) => isApproved(a.status)).length} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Rejected" value={apps.filter((a) => isRejected(a.status)).length} icon={XCircle} tone="rose" />
      </div>

      <Card>
        <CardHeader><CardTitle>Application history</CardTitle></CardHeader>
        <div className="border-t">
          <DataTable
            rows={apps}
            rowHref={(a) => `/manager/applications/${a.id}`}
            empty={<EmptyState icon={FileText} title="No applications yet" />}
            columns={[
              { key: 'id', header: 'ID', cell: (a) => <span className="font-semibold">{a.id}</span> },
              { key: 'd', header: 'Date', cell: (a) => formatDate(a.createdAt) },
              { key: 'amt', header: 'Amount', cell: (a) => <b className="tabular">{formatINR(a.amount)}</b> },
              { key: 't', header: 'Tenure', cell: (a) => `${a.tenure} months` },
              { key: 'p', header: 'Purpose', cell: (a) => a.purpose },
              { key: 'ag', header: 'Agent', cell: (a) => getUser(a.agentId)?.name || '—' },
              { key: 's', header: 'Status', cell: (a) => <StatusBadge status={a.status} /> },
            ]}
            mobileCard={(a) => (
              <div className="flex items-center justify-between gap-3">
                <div><p className="font-semibold">{formatINR(a.amount)} · {a.purpose}</p><p className="text-xs text-muted-foreground">{a.id} · {formatDate(a.createdAt)}</p></div>
                <StatusBadge status={a.status} />
              </div>
            )}
          />
        </div>
      </Card>
    </div>
  )
}
