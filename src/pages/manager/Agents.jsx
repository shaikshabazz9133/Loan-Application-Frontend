import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Eye, LayoutGrid, List, MapPin, MoreVertical, Pencil, Phone, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { STATUS, isApproved } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { NativeSelect } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EmptyState, PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { DataTable } from '@/components/shared/DataTable'
import { AgentFormDialog } from './AgentFormDialog'

export function agentStats(agentId, applications) {
  const mine = applications.filter((a) => a.agentId === agentId)
  const rec = mine.filter((a) => a.agentDecision?.decision === 'recommended').length
  const rej = mine.filter((a) => a.status === STATUS.AGENT_REJECTED).length
  return {
    total: mine.length,
    open: mine.filter((a) => a.status === STATUS.ASSIGNED).length,
    recommended: rec,
    rejected: rej,
    approved: mine.filter((a) => isApproved(a.status)).length,
    customers: new Set(mine.map((a) => a.customerId)).size,
  }
}

export default function Agents() {
  const { users, applications, setAgentActive, deleteAgent } = useStore()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [view, setView] = useState('grid')
  const [form, setForm] = useState({ open: false, agent: null })
  const [toDelete, setToDelete] = useState(null)

  const agents = useMemo(() => users.filter((u) => u.role === 'agent').map((a) => ({ ...a, stats: agentStats(a.id, applications) })), [users, applications])
  const rows = agents
    .filter((a) => status === 'all' || (status === 'active' ? a.active : !a.active))
    .filter((a) => {
      const s = q.toLowerCase()
      return !s || [a.name, a.email, a.mobile, a.area, a.employeeCode].some((v) => v?.toLowerCase().includes(s))
    })

  const toggle = async (a, v) => {
    let released
    try {
      released = await setAgentActive(a.id, v)
    } catch (e) {
      return toast.error(`Could not ${v ? 'activate' : 'deactivate'} ${a.name}`, { description: e.message })
    }
    toast.success(`${a.name} ${v ? 'activated' : 'deactivated'}`, released ? { description: `${released} unfinished application${released > 1 ? 's' : ''} returned to the open list for other agents.` } : undefined)
  }

  const Actions = ({ a }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${a.name}`}><MoreVertical className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild><Link to={`/manager/agents/${a.id}`}><Eye /> View details</Link></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setForm({ open: true, agent: a })}><Pencil /> Edit agent</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive [&_svg]:text-destructive" onSelect={() => setToDelete(a)}><Trash2 /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent management"
        description={`${agents.length} agents · ${agents.filter((a) => a.active).length} active`}
        actions={<Button onClick={() => setForm({ open: true, agent: null })}><Plus /> Add agent</Button>}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={q} onChange={setQ} placeholder="Search name, area, code…" />
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-40" aria-label="Filter by status">
          <option value="all">All agents</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </NativeSelect>
        <div className="ml-auto hidden rounded-lg bg-secondary p-1 sm:flex">
          {[['grid', LayoutGrid], ['list', List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} className={cn('rounded-md p-1.5', view === v ? 'bg-card shadow-sm' : 'text-muted-foreground')} aria-label={`${v} view`} aria-pressed={view === v}>
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={Briefcase} title="No agents found" action={<Button onClick={() => setForm({ open: true, agent: null })}><Plus /> Add agent</Button>} /></Card>
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a, i) => (
            <Card key={a.id} className={cn('animate-fade-up transition hover:shadow-lift', !a.active && 'opacity-75')} style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={a.name} className="size-12 text-sm" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/manager/agents/${a.id}`} className="block truncate font-bold hover:text-primary">{a.name}</Link>
                    <p className="text-xs text-muted-foreground">{a.employeeCode}</p>
                    <Badge variant={a.active ? 'success' : 'slate'} dot className="mt-1.5">{a.active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <Actions a={a} />
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><MapPin className="size-4" />{a.area}, {a.city}</p>
                  <p className="flex items-center gap-2"><Phone className="size-4" />{a.mobile}</p>
                </div>
                <div className="mt-4 grid grid-cols-3 divide-x rounded-xl border bg-muted/40 text-center">
                  {[['Assigned', a.stats.total], ['Open', a.stats.open], ['Recommended', a.stats.recommended]].map(([l, v]) => (
                    <div key={l} className="py-2.5"><p className="font-extrabold tabular">{v}</p><p className="text-[11px] text-muted-foreground">{l}</p></div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Switch checked={a.active} onCheckedChange={(v) => toggle(a, v)} aria-label={`${a.active ? 'Deactivate' : 'Activate'} ${a.name}`} />
                    {a.active ? 'Active' : 'Inactive'}
                  </label>
                  <Button size="sm" variant="ghost" asChild><Link to={`/manager/agents/${a.id}`}>Details</Link></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <DataTable
            rows={rows}
            rowHref={(a) => `/manager/agents/${a.id}`}
            columns={[
              { key: 'n', header: 'Agent', cell: (a) => <div className="flex items-center gap-3"><Avatar name={a.name} className="size-8 text-[10px]" /><div><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{a.employeeCode} · {a.email}</p></div></div> },
              { key: 'm', header: 'Mobile', cell: (a) => a.mobile },
              { key: 'ar', header: 'Area', cell: (a) => a.area },
              { key: 't', header: 'Assigned', cell: (a) => a.stats.total },
              { key: 'o', header: 'Open', cell: (a) => a.stats.open },
              { key: 'r', header: 'Recommended', cell: (a) => a.stats.recommended },
              { key: 's', header: 'Active', cell: (a) => <Switch checked={a.active} onCheckedChange={(v) => toggle(a, v)} aria-label={`Toggle ${a.name}`} /> },
              { key: 'x', header: '', className: 'text-right', cell: (a) => <Actions a={a} /> },
            ]}
            mobileCard={(a) => (
              <div className="flex items-center gap-3">
                <Avatar name={a.name} />
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{a.area} · {a.stats.total} assigned</p></div>
                <Switch checked={a.active} onCheckedChange={(v) => toggle(a, v)} aria-label={`Toggle ${a.name}`} />
              </div>
            )}
          />
        </Card>
      )}

      <AgentFormDialog open={form.open} agent={form.agent} onOpenChange={(o) => setForm((f) => ({ ...f, open: o }))} />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {toDelete?.name}?</DialogTitle>
            <DialogDescription>This permanently removes the agent. Agents with assigned applications can't be deleted — deactivate them instead.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await deleteAgent(toDelete.id)
                  toast.success('Agent deleted')
                  setToDelete(null)
                } catch (e) {
                  toast.error('Cannot delete agent', { description: e.message })
                  setToDelete(null)
                }
              }}
            >
              <Trash2 /> Delete agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
