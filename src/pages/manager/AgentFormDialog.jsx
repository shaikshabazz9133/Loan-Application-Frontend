import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { fieldErrors } from '@/lib/api'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

const EMPTY = { name: '', email: '', mobile: '', password: '', area: '', city: 'Hyderabad', active: true }

export function AgentFormDialog({ open, onOpenChange, agent }) {
  const { saveAgent } = useStore()
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setF(agent ? { ...EMPTY, ...agent, password: '' } : EMPTY)
  }, [open, agent])

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (f.name.trim().length < 3) er.name = 'Enter the agent’s full name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) er.email = 'Enter a valid email.'
    if (!/^[6-9]\d{9}$/.test(f.mobile)) er.mobile = 'Enter a valid 10-digit mobile.'
    if (!agent && f.password.length < 6) er.password = 'Minimum 6 characters.'
    if (agent && f.password && f.password.length < 6) er.password = 'Minimum 6 characters.'
    if (!f.area.trim()) er.area = 'Enter the operating area.'
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{agent ? 'Edit agent' : 'Add new agent'}</DialogTitle>
          <DialogDescription>The agent signs in with this email or mobile and password, and can accept any open application.</DialogDescription>
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

          <label className="flex items-center justify-between rounded-xl border p-4">
            <span>
              <span className="block text-sm font-semibold">Active</span>
              <span className="block text-xs text-muted-foreground">Inactive agents can't sign in. Their open work goes back to the other agents.</span>
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
