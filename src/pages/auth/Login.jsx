import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { ROLE_HOME } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import AuthLayout from './AuthLayout'

export default function Login() {
  const { login } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ identifier: '', password: '', remember: true })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.identifier.trim() || !form.password) return setError('Please enter your email/mobile and password.')
    setLoading(true)
    try {
      const user = await login(form.identifier, form.password, form.remember)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      const from = location.state?.from
      navigate(from && from.startsWith(ROLE_HOME[user.role]) ? from : ROLE_HOME[user.role], { replace: true })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-3xl font-extrabold">Welcome back</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue to your portal.</p>

      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <Field label="Email or mobile number" htmlFor="identifier">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="identifier"
              autoComplete="username"
              placeholder="you@example.com or 98765 43210"
              className="h-11 pl-10"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              aria-invalid={!!error}
            />
          </div>
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setForgotOpen(true)}>
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="h-11 px-10"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-invalid={!!error}
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Checkbox checked={form.remember} onCheckedChange={(v) => setForm({ ...form, remember: !!v })} />
          Remember me on this device
        </label>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : <>Sign in <ArrowRight /></>}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to LendWise?{' '}
        <Link to="/signup" className="font-bold text-primary hover:underline">
          Create an account
        </Link>
      </p>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} />
    </AuthLayout>
  )
}

function ForgotPasswordDialog({ open, onOpenChange }) {
  const [value, setValue] = useState('')
  const [sent, setSent] = useState(false)
  const close = (o) => {
    onOpenChange(o)
    if (!o) setTimeout(() => (setSent(false), setValue('')), 200)
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sent ? 'Check your inbox' : 'Reset your password'}</DialogTitle>
          <DialogDescription>
            {sent
              ? `If an account exists for ${value}, we've sent instructions to reset your password.`
              : "Enter the email or mobile number linked to your account and we'll send you a reset link."}
          </DialogDescription>
        </DialogHeader>
        {!sent && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (value.trim()) setSent(true)
            }}
            className="space-y-4"
          >
            <Input autoFocus placeholder="you@example.com" value={value} onChange={(e) => setValue(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button type="submit" disabled={!value.trim()}>Send reset link</Button>
            </DialogFooter>
          </form>
        )}
        {sent && (
          <DialogFooter>
            <Button onClick={() => close(false)}>Back to sign in</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
