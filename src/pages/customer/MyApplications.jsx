import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FileText, Plus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { isApproved, isPending, isRejected } from '@/lib/constants'
import { formatDate, formatINR } from '@/lib/utils'
import { emiOf } from '@/lib/kyc'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { MiniProgress, buildSteps } from '@/components/shared/StatusTimeline'

const FILTERS = { all: () => true, pending: isPending, approved: isApproved, rejected: isRejected }

export default function MyApplications() {
  const { currentUser: me, applications } = useStore()
  const [tab, setTab] = useState('all')
  const mine = applications.filter((a) => a.customerId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const list = mine.filter((a) => FILTERS[tab](a.status))

  return (
    <div>
      <PageHeader
        title="My applications"
        description="Track the progress of every loan you've applied for."
        actions={<Button asChild><Link to="/customer/apply"><Plus /> New application</Link></Button>}
      />
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          {Object.keys(FILTERS).map((k) => (
            <TabsTrigger key={k} value={k} className="capitalize">
              {k} <span className="text-xs text-muted-foreground">({mine.filter((a) => FILTERS[k](a.status)).length})</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {list.length === 0 ? (
        <Card><EmptyState icon={FileText} title="Nothing here yet" description="Applications matching this filter will appear here." /></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((a, i) => (
            <Link key={a.id} to={`/customer/applications/${a.id}`} className="group animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <Card className="p-5 transition group-hover:-translate-y-0.5 group-hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{a.id} · {formatDate(a.createdAt)}</p>
                    <p className="mt-1 text-xl font-extrabold tabular">{formatINR(a.amount)}</p>
                    <p className="text-sm text-muted-foreground">{a.purpose} · {a.tenure} months · EMI {formatINR(emiOf(a))}</p>
                  </div>
                  <StatusBadge status={a.status} audience="customer" />
                </div>
                <div className="mt-4"><MiniProgress steps={buildSteps(a)} /></div>
                <p className="mt-3 flex items-center justify-end text-sm font-semibold text-primary">
                  Track <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
