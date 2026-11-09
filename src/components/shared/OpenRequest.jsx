import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, Gauge, Hand, IndianRupee, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { cn, formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000)
  if (m < 60) return `${Math.max(m, 1)} min ago`
  if (m < 1440) return `${Math.round(m / 60)} h ago`
  return `${Math.round(m / 1440)} d ago`
}

/** "Accept" for an open application: the first agent to accept takes it (the server decides who was first). */
export function useAcceptApplication() {
  const { acceptApplication } = useStore()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)

  const accept = async (app) => {
    setBusy(app.id)
    try {
      await acceptApplication(app.id)
      toast.success('Application accepted', { description: `${app.id} is now yours to review.` })
      navigate(`/agent/applications/${app.id}`)
    } catch (e) {
      toast.error('Could not accept', { description: e.message })
    } finally {
      setBusy(null)
    }
  }
  return { accept, busy }
}

/** An open application waiting for any agent. */
export function OpenRequestCard({ app, onAccept, busy, className, style }) {
  return (
    <Card className={cn('flex flex-col overflow-hidden animate-fade-up', className)} style={style}>
      <div className="flex items-center justify-between border-b bg-amber-50/60 px-5 py-2.5 text-xs font-semibold text-amber-800">
        <span className="flex items-center gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-amber-500" /> Open · {app.id}</span>
        <span className="flex items-center gap-1 text-amber-700/80"><Clock className="size-3.5" />{ago(app.createdAt)}</span>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><IndianRupee className="size-3.5" /> Loan amount</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular">{formatINR(app.amount)}</p>
          <p className="text-sm text-muted-foreground">{app.tenure} months · {app.purpose} · {app.city}</p>
        </div>
        {app.creditScore != null && (
          <p className="flex items-center gap-1.5 text-sm"><Gauge className="size-4 text-primary" /> Credit score <b className="tabular">{app.creditScore}</b></p>
        )}
        <div className="mt-auto flex gap-2 pt-1">
          <Button className="flex-1" onClick={() => onAccept(app)} disabled={busy === app.id}>
            {busy === app.id ? <Loader2 className="animate-spin" /> : <Hand />} Accept
          </Button>
          <Button variant="outline" asChild><Link to={`/agent/applications/${app.id}`}>View</Link></Button>
        </div>
      </CardContent>
    </Card>
  )
}
