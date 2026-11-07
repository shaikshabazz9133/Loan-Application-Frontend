import { useEffect, useState } from 'react'
import { Loader2, LocateFixed } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { fieldErrors } from '@/lib/api'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { MapView } from '@/components/shared/MapView'

const AREAS = [
  { area: 'Banjara Hills', lat: 17.4126, lng: 78.4482 },
  { area: 'Madhapur', lat: 17.4483, lng: 78.3915 },
  { area: 'Uppal', lat: 17.4012, lng: 78.5590 },
  { area: 'LB Nagar', lat: 17.3480, lng: 78.5510 },
  { area: 'Ameerpet', lat: 17.4375, lng: 78.4482 },
]

const EMPTY = { name: '', email: '', mobile: '', password: '', area: '', city: 'Hyderabad', lat: '', lng: '', active: true }

export function AgentFormDialog({ open, onOpenChange, agent }) {
  const { saveAgent } = useStore()
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [locating, setLocating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setF(agent ? { ...EMPTY, ...agent, password: '', lat: String(agent.location?.lat ?? ''), lng: String(agent.location?.lng ?? '') } : EMPTY)
  }, [open, agent])

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const loc = f.lat !== '' && f.lng !== '' && !isNaN(+f.lat) && !isNaN(+f.lng) ? { lat: +f.lat, lng: +f.lng } : null
  const pick = (p) => setF((s) => ({ ...s, lat: String(p.lat), lng: String(p.lng) }))

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported in this browser')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => (pick({ lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }), setLocating(false)),
      () => (toast.error('Could not get location. Check browser permission.'), setLocating(false)),
      { enableHighAccuracy: true, timeout: 12000 }
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (f.name.trim().length < 3) er.name = 'Enter the agent’s full name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email.'
    if (!/^[6-9]\d{9}$/.test(f.mobile)) er.mobile = 'Enter a valid 10-digit mobile.'
    if (!agent && f.password.length < 6) er.password = 'Minimum 6 characters.'
    if (agent && f.password && f.password.length < 6) er.password = 'Minimum 6 characters.'
    if (!f.area.trim()) er.area = 'Enter the operating area.'
    if (!loc || Math.abs(loc.lat) > 90 || Math.abs(loc.lng) > 180) er.location = 'Set a valid location — click the map, use GPS or enter coordinates.'
    setErrors(er)
    if (Object.keys(er).length) return
    setSaving(true)
    try {
      await saveAgent({
        id: agent?.id,
        name: f.name.trim(),
        email: f.email.trim(),
        mobile: f.mobile,
        password: f.password || undefined,
        area: f.area.trim(),
        city: f.city.trim(),
        location: loc,
        active: f.active,
      })
      toast.success(agent ? 'Agent updated' : 'Agent added', { description: `${f.name} · ${f.area}` })
      onOpenChange(false)
    } catch (err) {
      const fields = fieldErrors(err)
      setErrors(Object.keys(fields).length ? fields : { form: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit agent' : 'Add new agent'}</DialogTitle>
          <DialogDescription>The agent will see loan requests from customers within 2 km of this location and can accept them.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="ag-name" error={errors.name} required>
              <Input id="ag-name" value={f.name} onChange={set('name')} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Mobile number" htmlFor="ag-mobile" error={errors.mobile} required>
              <Input id="ag-mobile" inputMode="numeric" value={f.mobile} onChange={(e) => setF((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))} aria-invalid={!!errors.mobile} />
            </Field>
            <Field label="Email" htmlFor="ag-email" error={errors.email} required>
              <Input id="ag-email" type="email" value={f.email} onChange={set('email')} aria-invalid={!!errors.email} />
            </Field>
            <Field label={agent ? 'New password' : 'Password'} htmlFor="ag-pw" error={errors.password} hint={agent ? 'Leave blank to keep the current password' : 'Agent uses this to sign in'} required={!agent}>
              <Input id="ag-pw" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} aria-invalid={!!errors.password} />
            </Field>
            <Field label="Operating area" htmlFor="ag-area" error={errors.area} required>
              <Input id="ag-area" placeholder="e.g. Banjara Hills" value={f.area} onChange={set('area')} aria-invalid={!!errors.area} />
            </Field>
            <Field label="City" htmlFor="ag-city">
              <Input id="ag-city" value={f.city} onChange={set('city')} />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Agent location <span className="text-destructive">*</span></Label>
              <Button type="button" size="sm" variant="outline" onClick={locate} disabled={locating}>
                {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Use my current location
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AREAS.map((a) => (
                <button key={a.area} type="button" onClick={() => setF((p) => ({ ...p, lat: String(a.lat), lng: String(a.lng), area: p.area || a.area }))} className="rounded-full border bg-card px-2.5 py-1 text-xs font-semibold transition hover:border-primary hover:text-primary">
                  {a.area}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input inputMode="decimal" placeholder="Latitude" value={f.lat} onChange={set('lat')} aria-label="Latitude" aria-invalid={!!errors.location} />
              <Input inputMode="decimal" placeholder="Longitude" value={f.lng} onChange={set('lng')} aria-label="Longitude" aria-invalid={!!errors.location} />
            </div>
            {loc && (
              <>
                <MapView className="h-56" center={loc} radiusKm={2} onPick={pick} markers={[{ id: 'a', position: loc, label: f.name || 'Agent', kind: 'agent' }]} />
                <p className="text-xs text-muted-foreground">Click on the map to fine-tune the location. The circle shows the 2 km assignment radius.</p>
              </>
            )}
            {errors.location && <p className="text-xs font-medium text-destructive">{errors.location}</p>}
          </div>

          <label className="flex items-center justify-between rounded-xl border p-4">
            <span>
              <span className="block text-sm font-semibold">Active</span>
              <span className="block text-xs text-muted-foreground">Inactive agents can't sign in or see new requests.</span>
            </span>
            <Switch checked={f.active} onCheckedChange={(v) => setF((p) => ({ ...p, active: v }))} />
          </label>

          {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{errors.form}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : agent ? 'Save changes' : 'Add agent'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
