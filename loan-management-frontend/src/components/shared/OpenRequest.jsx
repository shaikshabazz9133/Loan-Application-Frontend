import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clock, EyeOff, Hand, IndianRupee, MapPin, Navigation, X } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { cn, distanceKm, formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { googleMapsLink } from './MapView'
import { ReasonDialog } from './ReasonDialog'

const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000)
  if (m < 60) return `${Math.max(m, 1)} min ago`
  if (m < 1440) return `${Math.round(m / 60)} h ago`
  return `${Math.round(m / 1440)} d ago`
}

/** Accept / decline actions shared by the card and the detail page. */
export function useOpenRequestActions({ afterDecline } = {}) {
  const { claimApplication, declineApplication } = useStore()
  const navigate = useNavigate()
  const [declining, setDeclining] = useState(null)

  const accept = (app) => {
    try {
      claimApplication(app.id)
      toast.success('Application accepted', { description: `${app.id} is now yours. Full customer details are unlocked.` })
      navigate(`/agent/applications/${app.id}`)
    } catch (e) {
      toast.error('Could not accept', { description: e.message })
    }
  }

  const dialog = (
    <ReasonDialog
      open={!!declining}
      onOpenChange={(o) => !o && setDeclining(null)}
      title="Decline this request?"
      description="It will be hidden from your list. Other agents in the area can still accept it."
      label="Reason (optional)"
      placeholder="e.g. Fully booked this week"
      confirmLabel="Decline request"
      variant="destructive"
      presets={['Fully booked', 'Outside my working hours', 'Conflict of interest']}
      onConfirm={(reason) => {
        declineApplication(declining.id, reason)
        toast('Request declined', { description: declining.id })
        setDeclining(null)
        afterDecline?.()
      }}
    />
  )

  return { accept, decline: setDeclining, dialog }
}

/** Limited view of an open request: loan amount, address and location only. */
export function OpenRequestCard({ app, agent, onAccept, onDecline, className, style }) {
  const dist = distanceKm(app.location, agent.location)
  return (
    <Card className={cn('flex flex-col overflow-hidden animate-fade-up', className)} style={style}>
      <div className="flex items-center justify-between border-b bg-amber-50/60 px-5 py-2.5 text-xs font-semibold text-amber-800">
        <span className="flex items-center gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-amber-500" /> Open request · {app.id}</span>
        <span className="flex items-center gap-1 text-amber-700/80"><Clock className="size-3.5" />{ago(app.createdAt)}</span>
      </div>
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><IndianRupee className="size-3.5" /> Loan amount</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular">{formatINR(app.amount)}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><MapPin className="size-3.5" /> Address</p>
          <p className="mt-0.5 text-sm font-semibold">{app.address}, {app.city} - {app.pincode}</p>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/70 px-3 py-2 text-sm">
          <span className="flex items-center gap-1.5 font-semibold"><Navigation className="size-4 text-primary" />{dist.toFixed(2)} km from you</span>
          <a href={googleMapsLink(app.location)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">Open map</a>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><EyeOff className="size-3.5" /> Customer details unlock after you accept.</p>
        <div className="mt-auto flex gap-2">
          <Button className="flex-1" onClick={() => onAccept(app)}><Hand /> Accept</Button>
          <Button variant="outline" onClick={() => onDecline(app)} aria-label={`Decline ${app.id}`}><X /> Decline</Button>
        </div>
        <Link to={`/agent/applications/${app.id}`} className="text-center text-xs font-semibold text-muted-foreground hover:text-primary">View location on map</Link>
      </CardContent>
    </Card>
  )
}

