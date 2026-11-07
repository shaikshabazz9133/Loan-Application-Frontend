import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import AuthLayout from './AuthLayout'

function strength(pw) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/\d/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}
const STRENGTH = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-teal-500', 'bg-emerald-500']

export default function Signup() {
  const { signup, login } = useStore()
  const navigate = useNavigate()
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: '', confirm: '', terms: false })
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const validate = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Please enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address.'
    if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number.'
    if (f.password.length < 8) e.password = 'Use at least 8 characters.'
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.'
    if (!f.terms) e.terms = 'You must accept the terms and conditions.'
    return e
  }

  const submit = (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    try {
      signup(f)
      login(f.email, f.password, true)
      toast.success('Account created! Welcome to LendWise.')
      navigate('/customer', { replace: true })
    } catch (err) {
      setErrors({ form: err.message })
    }
  }

  const s = strength(f.password)

  return (
    <AuthLayout>
      <h2 className="text-3xl font-extrabold">Create your account</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">Apply for a loan in minutes. No paperwork to start.</p>

      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <Field label="Full name" htmlFor="name" error={errors.name}>
          <Input id="name" autoComplete="name" placeholder="As on your PAN card" value={f.name} onChange={set('name')} aria-invalid={!!errors.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email address" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set('email')} aria-invalid={!!errors.email} />
          </Field>
          <Field label="Mobile number" htmlFor="mobile" error={errors.mobile}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">+91</span>
              <Input
                id="mobile"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98765 43210"
                className="pl-11"
                value={f.mobile}
                onChange={(e) => setF({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                aria-invalid={!!errors.mobile}
              />
            </div>
          </Field>
        </div>
        <Field label="Password" htmlFor="password" error={errors.password}>
          <div className="relative">
            <Input id="password" type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="Minimum 8 characters" className="pr-10" value={f.password} onChange={set('password')} aria-invalid={!!errors.password} />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {f.password && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={cn('h-1 flex-1 rounded-full', i < s ? STRENGTH_COLOR[s] : 'bg-border')} />
                ))}
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{STRENGTH[s]}</span>
            </div>
          )}
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
          <Input id="confirm" type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter password" value={f.confirm} onChange={set('confirm')} aria-invalid={!!errors.confirm} />
        </Field>

        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <Checkbox className="mt-0.5" checked={f.terms} onCheckedChange={(v) => setF({ ...f, terms: !!v })} aria-invalid={!!errors.terms} />
            <span className="text-muted-foreground">
              I agree to the{' '}
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setTermsOpen(true)}>
                Terms & Conditions
              </button>{' '}
              and Privacy Policy, and consent to sharing my location for agent assignment.
            </span>
          </label>
          {errors.terms && <p className="mt-1 text-xs font-medium text-destructive">{errors.terms}</p>}
        </div>

        {errors.form && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{errors.form}</p>}

        <Button type="submit" size="lg" className="w-full">
          Create account <ArrowRight />
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link>
      </p>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
            <DialogDescription>Please read these terms before creating your account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><b className="text-foreground">1. Eligibility.</b> You must be at least 18 years old and a resident of India to apply.</p>
            <p><b className="text-foreground">2. Accurate information.</b> You confirm that all details you provide are true. Incorrect information may lead to rejection.</p>
            <p><b className="text-foreground">3. Location.</b> Your device location is used only to assign the nearest verification agent to your application.</p>
            <p><b className="text-foreground">4. Verification.</b> An agent may contact or visit you to verify your identity, income and address.</p>
            <p><b className="text-foreground">5. Decision.</b> Loan approval is at the sole discretion of the lender. Agent recommendations are not final approvals.</p>
          </div>
          <Button onClick={() => (setF({ ...f, terms: true }), setTermsOpen(false))}>I agree</Button>
        </DialogContent>
      </Dialog>
    </AuthLayout>
  )
}
