import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, Briefcase, Check, CheckCircle2, Crosshair, FileText, FileUp, IndianRupee, Loader2, LocateFixed, MapPin, RefreshCw, Send, ShieldCheck, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'
import { useStore, rankAgents } from '@/lib/store'
import { ASSIGNMENT_RADIUS_KM, EMPLOYMENT_TYPES, LOAN_PURPOSES } from '@/lib/constants'
import { cn, formatDate, formatINR, uid } from '@/lib/utils'
import { AADHAAR_DEMO_MODE, INTEREST_RATE, MAX_AGE, MAX_FOIR, MIN_AGE, PAN_RE, TENURES, ageFrom, emiFor, formatAadhaar, isValidAadhaar, makeDemoAadhaar, makeDemoPan, maskAadhaar, tenureLabel } from '@/lib/kyc'
import { DOC_ACCEPT, formatBytes, putDoc, validateDocFile } from '@/lib/docs'
import { DOC_TYPES, isDocRequired } from '@/lib/verification'
import { ACCOUNT_TYPES, bankFromIfsc, isValidAccount, isValidIfsc, maskAccount } from '@/lib/bank'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input, NativeSelect } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Avatar } from '@/components/ui/avatar'
import { PageHeader } from '@/components/shared/PageHeader'
import { MapView } from '@/components/shared/MapView'

const STEPS = [
  { title: 'Personal details', icon: User },
  { title: 'Loan details', icon: IndianRupee },
  { title: 'Address & location', icon: MapPin },
  { title: 'Bank & documents', icon: FileUp },
  { title: 'Review & submit', icon: Check },
]

// Handy test points so the 2 km assignment can be tried from anywhere.
const DEMO_SPOTS = [
  { label: 'Banjara Hills, Hyderabad', lat: 17.4152, lng: 78.4421, pincode: '500034' },
  { label: 'Madhapur, Hyderabad', lat: 17.4470, lng: 78.3880, pincode: '500081' },
  { label: 'Kukatpally, Hyderabad', lat: 17.4920, lng: 78.4040, pincode: '500072' },
  { label: 'Uppal, Hyderabad (no agent nearby)', lat: 17.4058, lng: 78.5591, pincode: '500039' },
]

export default function ApplyLoan() {
  const { currentUser: me, users, submitApplication } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [geo, setGeo] = useState({ state: 'idle', message: '' })
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [f, setF] = useState({
    fullName: me.name,
    mobile: me.mobile,
    email: me.email,
    dob: '',
    aadhaar: '',
    pan: '',
    amount: '',
    tenure: '',
    purpose: '',
    income: '',
    employment: '',
    address: '',
    city: '',
    pincode: '',
    location: null,
  })
  const [bank, setBank] = useState({ holder: me.name, account: '', confirm: '', ifsc: '', type: 'Savings' })
  const setB = (k, fn = (v) => v) => (e) => {
    setBank((p) => ({ ...p, [k]: fn(e.target.value) }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }
  const [files, setFiles] = useState({})
  const [consent, setConsent] = useState(false)
  const emi = emiFor(f.amount, f.tenure)
  const foir = Number(f.income) ? emi / Number(f.income) : 0
  const today = new Date()
  const ymd = (yrs) => new Date(today.getFullYear() - yrs, today.getMonth(), today.getDate()).toISOString().slice(0, 10)
  const fillDemoIds = (low) => {
    const initial = (f.fullName.trim().split(' ').pop() || 'K')[0]
    setF((p) => ({ ...p, dob: p.dob || '1991-05-20', aadhaar: makeDemoAadhaar(), pan: makeDemoPan(initial, low) }))
    setErrors({})
    toast(`Filled test IDs (${low ? 'low' : 'good'} credit score)`)
  }
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const digits = (k, max) => (e) => setF((p) => ({ ...p, [k]: e.target.value.replace(/\D/g, '').slice(0, max) }))

  const nearby = useMemo(() => (f.location ? rankAgents(users, f.location).filter((r) => r.distance <= ASSIGNMENT_RADIUS_KM) : []), [users, f.location])

  const validateStep = (s) => {
    const e = {}
    if (s === 0) {
      if (f.fullName.trim().length < 3) e.fullName = 'Enter your full name.'
      if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a valid 10-digit mobile number.'
      if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email.'
      const age = ageFrom(f.dob)
      if (!f.dob) e.dob = 'Enter your date of birth.'
      else if (age < MIN_AGE || age > MAX_AGE) e.dob = `Applicants must be between ${MIN_AGE} and ${MAX_AGE} years old (you are ${age}).`
      const aErr = aadhaarError(f.aadhaar)
      if (aErr) e.aadhaar = aErr
      if (!PAN_RE.test(f.pan)) e.pan = 'Enter a valid individual PAN, e.g. ABCPK1234D (4th letter is P).'
    }
    if (s === 1) {
      const amt = Number(f.amount)
      if (!amt || amt < 10000) e.amount = 'Minimum loan amount is ₹10,000.'
      else if (amt > 5000000) e.amount = 'Maximum loan amount is ₹50,00,000.'
      if (!f.purpose) e.purpose = 'Select a loan purpose.'
      if (!Number(f.income) || Number(f.income) < 5000) e.income = 'Enter your monthly income (min ₹5,000).'
      if (!f.employment) e.employment = 'Select your employment type.'
      if (!f.tenure) e.tenure = 'Choose a loan tenure.'
    }
    if (s === 2) {
      if (f.address.trim().length < 5) e.address = 'Enter your full address.'
      if (f.city.trim().length < 2) e.city = 'Enter your city.'
      if (!/^\d{6}$/.test(f.pincode)) e.pincode = 'Enter a valid 6-digit pincode.'
      if (!f.location) e.location = 'Share your location so agents in your area can see your request.'
    }
    if (s === 3) {
      if (bank.holder.trim().length < 3) e.holder = 'Enter the account holder name.'
      if (!isValidAccount(bank.account)) e.account = 'Enter a valid account number (9–18 digits).'
      if (bank.confirm !== bank.account) e.confirm = 'Account numbers do not match.'
      if (!isValidIfsc(bank.ifsc)) e.ifsc = 'Enter a valid IFSC, e.g. HDFC0001234.'
      DOC_TYPES.filter((d) => isDocRequired(d, f.employment) && !files[d.key]).forEach((d) => (e[`doc_${d.key}`] = `Upload your ${d.label.toLowerCase()}.`))
    }
    if (s === 4 && !consent) e.consent = 'Please accept to continue.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => validateStep(step) && setStep((s) => s + 1)
  const back = () => setStep((s) => s - 1)

  const requestLocation = () => {
    if (!('geolocation' in navigator)) return setGeo({ state: 'error', message: 'Your browser does not support location access.' })
    setGeo({ state: 'loading', message: '' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF((p) => ({ ...p, location: { lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) } }))
        setGeo({ state: 'ok', message: `Accurate to ~${Math.round(pos.coords.accuracy)} m` })
        setErrors((e) => ({ ...e, location: undefined }))
      },
      (err) =>
        setGeo({
          state: 'error',
          message: err.code === 1 ? 'Location permission was denied. Please allow location access in your browser settings and try again.' : 'We could not get your location. Please try again.',
        }),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const applyDemoSpot = (spot) => {
    setF((p) => ({ ...p, location: { lat: spot.lat, lng: spot.lng }, city: p.city || 'Hyderabad', pincode: p.pincode || spot.pincode }))
    setGeo({ state: 'ok', message: `Demo location: ${spot.label}` })
    setErrors((e) => ({ ...e, location: undefined }))
  }

  const submit = async () => {
    if (!validateStep(4)) return
    setSubmitting(true)
    try {
      const documents = {}
      for (const [key, file] of Object.entries(files)) {
        const docKey = uid('doc')
        await putDoc(docKey, file)
        documents[key] = { key: docKey, name: file.name, size: file.size, type: file.type, uploadedAt: new Date().toISOString() }
      }
      const r = submitApplication({ ...f, documents, bank: { holder: bank.holder.trim(), account: bank.account, ifsc: bank.ifsc, bankName: bankFromIfsc(bank.ifsc), type: bank.type } })
      setResult(r)
      toast.success('Application submitted successfully')
    } catch (err) {
      toast.error('Could not submit application', { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (result) return <SubmittedScreen result={result} onTrack={() => navigate(`/customer/applications/${result.app.id}`)} />

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Apply for a loan" description="Takes about 5 minutes. Keep your PAN, Aadhaar and bank statements handy." back={{ to: '/customer', label: 'Dashboard' }} />

      <ol className="mb-6 grid grid-cols-5 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.title} className="min-w-0">
            <div className={cn('h-1.5 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-border')} />
            <div className={cn('mt-2 flex items-center gap-1.5 text-xs font-semibold', i === step ? 'text-foreground' : 'text-muted-foreground')}>
              <s.icon className="hidden size-3.5 shrink-0 sm:block" />
              <span className="truncate">{s.title}</span>
            </div>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="p-5 sm:p-7">
          {step === 0 && (
            <div className="space-y-5 animate-fade-up">
              <SectionTitle title="Personal details" text="We've pre-filled these from your profile." />
              <Field label="Full name" htmlFor="fullName" error={errors.fullName} required>
                <Input id="fullName" value={f.fullName} onChange={set('fullName')} aria-invalid={!!errors.fullName} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Mobile number" htmlFor="mobile" error={errors.mobile} required>
                  <Input id="mobile" inputMode="numeric" value={f.mobile} onChange={digits('mobile', 10)} aria-invalid={!!errors.mobile} />
                </Field>
                <Field label="Email" htmlFor="email" error={errors.email} required>
                  <Input id="email" type="email" value={f.email} onChange={set('email')} aria-invalid={!!errors.email} />
                </Field>
              </div>

              <div className="border-t pt-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <SectionTitle title="Identity (KYC)" text="Used to verify you and check your credit score." />
                    {AADHAAR_DEMO_MODE && <span className="mt-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Demo mode</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="self-center font-semibold text-muted-foreground">Testing?</span>
                    <button type="button" onClick={() => fillDemoIds(false)} className="rounded-full border bg-card px-2.5 py-1 font-semibold hover:border-primary hover:text-primary">Fill test IDs · good credit</button>
                    <button type="button" onClick={() => fillDemoIds(true)} className="rounded-full border bg-card px-2.5 py-1 font-semibold hover:border-destructive hover:text-destructive">Fill test IDs · low credit</button>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Date of birth" htmlFor="dob" error={errors.dob} hint={f.dob && !errors.dob ? `Age ${ageFrom(f.dob)}` : `Age ${MIN_AGE}–${MAX_AGE}`} required>
                    <Input id="dob" type="date" min={ymd(MAX_AGE + 1)} max={ymd(MIN_AGE)} value={f.dob} onChange={set('dob')} aria-invalid={!!errors.dob} />
                  </Field>
                  <Field
                    label="Aadhaar number"
                    htmlFor="aadhaar"
                    error={errors.aadhaar || (f.aadhaar.length === 12 ? aadhaarError(f.aadhaar) : null)}
                    hint={
                      f.aadhaar.length !== 12
                        ? `${f.aadhaar.length}/12 digits`
                        : isValidAadhaar(f.aadhaar)
                          ? '✓ Valid Aadhaar number'
                          : '⚠ Checksum does not match. Accepted in demo mode only.'
                    }
                    required
                  >
                    <Input
                      id="aadhaar"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="1234 5678 9012"
                      className="tabular tracking-wider"
                      value={formatAadhaar(f.aadhaar)}
                      onChange={(e) => {
                        setF((p) => ({ ...p, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) }))
                        setErrors((er) => ({ ...er, aadhaar: undefined }))
                      }}
                      aria-invalid={!!errors.aadhaar}
                    />
                    {AADHAAR_DEMO_MODE && (
                      <button
                        type="button"
                        onClick={() => (setF((p) => ({ ...p, aadhaar: makeDemoAadhaar() })), setErrors((er) => ({ ...er, aadhaar: undefined })))}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Use demo Aadhaar
                      </button>
                    )}
                  </Field>
                  <Field label="PAN number" htmlFor="pan" error={errors.pan} hint={PAN_RE.test(f.pan) ? '✓ Valid PAN format' : 'e.g. ABCPK1234D'} required>
                    <Input
                      id="pan"
                      autoComplete="off"
                      placeholder="ABCPK1234D"
                      className="uppercase tabular tracking-wider"
                      value={f.pan}
                      onChange={(e) => setF((p) => ({ ...p, pan: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) }))}
                      aria-invalid={!!errors.pan}
                    />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-fade-up">
              <SectionTitle title="Loan details" text="Tell us how much you need and why." />
              <Field label="Loan amount" htmlFor="amount" error={errors.amount} hint="Between ₹10,000 and ₹50,00,000" required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₹</span>
                  <Input id="amount" inputMode="numeric" placeholder="1,00,000" className="h-12 pl-8 text-lg font-bold tabular" value={f.amount ? Number(f.amount).toLocaleString('en-IN') : ''} onChange={digits('amount', 8)} aria-invalid={!!errors.amount} />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[50000, 100000, 200000, 500000].map((v) => (
                    <button key={v} type="button" onClick={() => setF((p) => ({ ...p, amount: String(v) }))} className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition hover:border-primary hover:text-primary', Number(f.amount) === v && 'border-primary bg-accent text-primary')}>
                      {formatINR(v)}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Loan purpose" htmlFor="purpose" error={errors.purpose} required>
                  <NativeSelect id="purpose" value={f.purpose} onChange={set('purpose')} aria-invalid={!!errors.purpose}>
                    <option value="" disabled>Select purpose</option>
                    {LOAN_PURPOSES.map((p) => <option key={p}>{p}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Employment type" htmlFor="employment" error={errors.employment} required>
                  <NativeSelect id="employment" value={f.employment} onChange={set('employment')} aria-invalid={!!errors.employment}>
                    <option value="" disabled>Select employment type</option>
                    {EMPLOYMENT_TYPES.map((p) => <option key={p}>{p}</option>)}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Monthly income" htmlFor="income" error={errors.income} required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                  <Input id="income" inputMode="numeric" placeholder="50,000" className="pl-7 tabular" value={f.income ? Number(f.income).toLocaleString('en-IN') : ''} onChange={digits('income', 8)} aria-invalid={!!errors.income} />
                </div>
              </Field>
              <Field label="Loan tenure" error={errors.tenure} required>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-9" role="radiogroup" aria-label="Loan tenure">
                  {TENURES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={Number(f.tenure) === m}
                      onClick={() => (setF((p) => ({ ...p, tenure: String(m) })), setErrors((e) => ({ ...e, tenure: undefined })))}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-center transition hover:border-primary',
                        Number(f.tenure) === m ? 'border-primary bg-accent text-primary ring-2 ring-primary/20' : 'bg-card',
                        errors.tenure && 'border-destructive/50'
                      )}
                    >
                      <span className="block text-base font-extrabold tabular">{m}</span>
                      <span className="block text-[11px] text-muted-foreground">months</span>
                    </button>
                  ))}
                </div>
              </Field>

              {emi > 0 && (
                <div className="grid gap-4 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 p-5 text-white sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-100">Estimated EMI</p>
                    <p className="mt-1 text-3xl font-extrabold tabular">{formatINR(emi)}<span className="text-base font-semibold text-teal-100">/mo</span></p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-100">Total payable</p>
                    <p className="mt-1 text-xl font-bold tabular">{formatINR(emi * f.tenure)}</p>
                    <p className="text-xs text-teal-100">Interest {formatINR(emi * f.tenure - f.amount)} at {INTEREST_RATE}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-100">EMI vs income</p>
                    <p className="mt-1 text-xl font-bold tabular">{Number(f.income) ? `${Math.round(foir * 100)}%` : '—'}</p>
                    <p className="text-xs text-teal-100">{foir > MAX_FOIR ? '⚠ Above 50% — may be rejected' : 'Within the 50% limit'}</p>
                  </div>
                  <p className="text-[11px] text-teal-100/80 sm:col-span-3">Indicative only. Final rate depends on your credit score and verification.</p>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-up">
              <SectionTitle title="Address & location" text={`Your GPS location lets verified agents within ${ASSIGNMENT_RADIUS_KM} km see your request.`} />
              <Field label="Address" htmlFor="address" error={errors.address} required>
                <Input id="address" placeholder="House no., street, locality" value={f.address} onChange={set('address')} aria-invalid={!!errors.address} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="City" htmlFor="city" error={errors.city} required>
                  <Input id="city" value={f.city} onChange={set('city')} aria-invalid={!!errors.city} />
                </Field>
                <Field label="Pincode" htmlFor="pincode" error={errors.pincode} required>
                  <Input id="pincode" inputMode="numeric" value={f.pincode} onChange={digits('pincode', 6)} aria-invalid={!!errors.pincode} />
                </Field>
              </div>

              <div className={cn('rounded-xl border-2 border-dashed p-4 sm:p-5', errors.location ? 'border-destructive/50 bg-red-50/40' : 'border-border bg-muted/40')}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Crosshair className="size-5" />
                    </span>
                    <div>
                      <p className="font-bold">Your location</p>
                      {f.location ? (
                        <p className="text-sm text-muted-foreground tabular">
                          {f.location.lat.toFixed(5)}, {f.location.lng.toFixed(5)} · {geo.message}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Your browser will ask for permission.</p>
                      )}
                    </div>
                  </div>
                  <Button type="button" variant={f.location ? 'outline' : 'default'} onClick={requestLocation} disabled={geo.state === 'loading'}>
                    {geo.state === 'loading' ? <Loader2 className="animate-spin" /> : <LocateFixed />}
                    {f.location ? 'Update location' : 'Share my location'}
                  </Button>
                </div>

                {geo.state === 'error' && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {geo.message}
                  </p>
                )}
                {errors.location && !f.location && <p className="mt-3 text-xs font-medium text-destructive">{errors.location}</p>}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground">Testing? Use a demo location:</span>
                  {DEMO_SPOTS.map((s) => (
                    <button key={s.label} type="button" onClick={() => applyDemoSpot(s)} className="rounded-full border bg-card px-2.5 py-1 font-semibold transition hover:border-primary hover:text-primary">
                      {s.label}
                    </button>
                  ))}
                </div>

                {f.location && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <MapView
                      className="h-64"
                      center={f.location}
                      radiusKm={ASSIGNMENT_RADIUS_KM}
                      markers={[
                        { id: 'me', position: f.location, label: 'You', kind: 'primary' },
                        ...nearby.map((r) => ({ id: r.agent.id, position: r.agent.location, label: `${r.agent.name} · ${r.distance.toFixed(1)} km`, kind: 'agent' })),
                      ]}
                    />
                    <NearbyAgents nearby={nearby} />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-fade-up">
              <SectionTitle title="Disbursement bank account" text="Once your loan is approved, the amount is sent to this account. It must be in your name." />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Account holder name" htmlFor="holder" error={errors.holder} required>
                  <Input id="holder" value={bank.holder} onChange={setB('holder')} aria-invalid={!!errors.holder} />
                </Field>
                <Field label="Account type" htmlFor="acctype">
                  <NativeSelect id="acctype" value={bank.type} onChange={setB('type')}>
                    {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </NativeSelect>
                </Field>
                <Field label="Account number" htmlFor="account" error={errors.account} required>
                  <Input id="account" type="password" inputMode="numeric" autoComplete="off" className="tabular tracking-wider" placeholder="9–18 digits" value={bank.account} onChange={setB('account', (v) => v.replace(/\D/g, '').slice(0, 18))} aria-invalid={!!errors.account} />
                </Field>
                <Field label="Confirm account number" htmlFor="confirm" error={errors.confirm} hint={bank.confirm && bank.confirm === bank.account ? '✓ Account numbers match' : undefined} required>
                  <Input id="confirm" inputMode="numeric" autoComplete="off" className="tabular tracking-wider" placeholder="Re-enter account number" value={bank.confirm} onChange={setB('confirm', (v) => v.replace(/\D/g, '').slice(0, 18))} onPaste={(e) => e.preventDefault()} aria-invalid={!!errors.confirm} />
                </Field>
                <Field label="IFSC code" htmlFor="ifsc" error={errors.ifsc} hint={isValidIfsc(bank.ifsc) ? `✓ ${bankFromIfsc(bank.ifsc)}` : 'e.g. HDFC0001234 — printed on your cheque book'} required>
                  <Input id="ifsc" autoComplete="off" className="uppercase tabular tracking-wider" placeholder="HDFC0001234" value={bank.ifsc} onChange={setB('ifsc', (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} aria-invalid={!!errors.ifsc} />
                </Field>
                <div className="flex items-end">
                  <button type="button" onClick={() => (setBank((p) => ({ ...p, account: '50100234567890', confirm: '50100234567890', ifsc: 'HDFC0001234' })), setErrors((er) => ({ ...er, account: undefined, confirm: undefined, ifsc: undefined })))} className="mb-2 rounded-full border bg-card px-2.5 py-1 text-xs font-semibold hover:border-primary hover:text-primary">
                    Testing? Fill a sample account
                  </button>
                </div>
              </div>

              <div className="border-t pt-5">
              <SectionTitle title="Upload documents" text="JPG, PNG or PDF, up to 5 MB each. Clear photos help us verify you faster." />
              </div>
              <div className="space-y-3">
                {DOC_TYPES.map((d) => (
                  <DocUpload
                    key={d.key}
                    doc={d}
                    required={isDocRequired(d, f.employment)}
                    employment={f.employment}
                    file={files[d.key]}
                    error={errors[`doc_${d.key}`]}
                    onChange={(file) => {
                      setFiles((p) => {
                        const n = { ...p }
                        if (file) n[d.key] = file
                        else delete n[d.key]
                        return n
                      })
                      setErrors((e) => ({ ...e, [`doc_${d.key}`]: undefined }))
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fade-up">
              <SectionTitle title="Review your application" text="Please confirm everything is correct before submitting." />
              <ReviewBlock title="Personal & KYC" onEdit={() => setStep(0)} rows={[['Full name', f.fullName], ['Date of birth', `${formatDate(f.dob)} (${ageFrom(f.dob)} yrs)`], ['Mobile', f.mobile], ['Email', f.email], ['Aadhaar', maskAadhaar(f.aadhaar)], ['PAN', f.pan]]} />
              <ReviewBlock title="Loan" onEdit={() => setStep(1)} rows={[['Amount', formatINR(f.amount)], ['Tenure', tenureLabel(Number(f.tenure))], ['Estimated EMI', `${formatINR(emi)}/month`], ['Purpose', f.purpose], ['Monthly income', formatINR(f.income)], ['Employment', f.employment]]} />
              <ReviewBlock title="Address" onEdit={() => setStep(2)} rows={[['Address', f.address], ['City', f.city], ['Pincode', f.pincode], ['GPS', `${f.location.lat.toFixed(5)}, ${f.location.lng.toFixed(5)}`]]} />
              <ReviewBlock title="Disbursement account" onEdit={() => setStep(3)} rows={[['Account holder', bank.holder], ['Bank', bankFromIfsc(bank.ifsc)], ['Account number', maskAccount(bank.account)], ['IFSC', bank.ifsc], ['Type', bank.type]]} />
              <ReviewBlock title="Documents" onEdit={() => setStep(3)} rows={DOC_TYPES.filter((d) => files[d.key]).map((d) => [d.label, `${files[d.key].name} · ${formatBytes(files[d.key].size)}`])} />
              <label className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm', errors.consent && 'border-destructive bg-red-50/50')}>
                <Checkbox className="mt-0.5" checked={consent} onCheckedChange={(v) => (setConsent(!!v), setErrors((e) => ({ ...e, consent: undefined })))} />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="size-4 text-primary" /> I authorise LendWise to check my credit score</span>
                  <span className="mt-0.5 block text-muted-foreground">I confirm the details and documents are true, and I consent to a credit bureau check using my PAN. Applications with a credit score below 650 are not approved.</span>
                  {errors.consent && <span className="mt-1 block text-xs font-medium text-destructive">{errors.consent}</span>}
                </span>
              </label>
              <div className={cn('flex items-start gap-3 rounded-xl p-4 text-sm', nearby.length ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
                {nearby.length ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
                <p>
                  {nearby.length
                    ? <>Your application goes to our manager and to <b>{nearby.length} agent{nearby.length > 1 ? 's' : ''}</b> in your area. The first agent to accept it will verify your details.</>
                    : <>No agent covers your area right now. Your application still goes to our manager, and an agent will pick it up once one is available in your area.</>}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
            {step > 0 ? (
              <Button variant="ghost" onClick={back}><ArrowLeft /> Back</Button>
            ) : (
              <Button variant="ghost" asChild><Link to="/customer">Cancel</Link></Button>
            )}
            {step < 4 ? (
              <Button onClick={next}>Continue <ArrowRight /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting} size="lg">
                {submitting ? <><Loader2 className="animate-spin" /> Uploading documents…</> : <><Send /> Submit application</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Clear, specific Aadhaar messages (length → first digit → UIDAI Verhoeff check digit). */
function aadhaarError(n) {
  if (!n) return 'Enter your 12-digit Aadhaar number.'
  if (n.length !== 12) return `Aadhaar numbers have 12 digits. You've entered ${n.length}.`
  if (!/^[2-9]/.test(n)) return 'Aadhaar numbers never start with 0 or 1. Please check the first digit.'
  if (!isValidAadhaar(n) && !AADHAAR_DEMO_MODE) return "This number fails UIDAI's check-digit test, so one digit is likely mistyped or two digits are swapped. Please compare it with your Aadhaar card."
  return null
}

function SectionTitle({ title, text }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function NearbyAgents({ nearby }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm font-bold">Agents in your area</p>
      <p className="text-xs text-muted-foreground">The first one to accept will handle your application.</p>
      {nearby.length === 0 ? (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-semibold">No agent nearby</p>
          <p className="mt-0.5 text-xs">You can still apply. Our manager will see your application.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {nearby.slice(0, 4).map((r) => (
            <li key={r.agent.id} className="flex items-center gap-3 rounded-lg p-2">
              <Avatar name={r.agent.name} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{r.agent.name}</p>
                <p className="text-xs text-muted-foreground">{r.agent.area}</p>
              </div>
              <span className="text-xs font-bold tabular text-primary">{r.distance.toFixed(1)} km</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DocUpload({ doc, required, employment, file, error, onChange }) {
  const input = useRef(null)
  const [drag, setDrag] = useState(false)
  const [localError, setLocalError] = useState('')
  const preview = useMemo(() => (file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const pick = (f) => {
    if (!f) return
    const err = validateDocFile(f)
    setLocalError(err || '')
    if (!err) onChange(f)
  }
  const shownError = localError || error

  return (
    <div
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => (e.preventDefault(), setDrag(false), pick(e.dataTransfer.files?.[0]))}
      className={cn(
        'flex flex-col gap-3 rounded-xl border-2 border-dashed p-4 transition sm:flex-row sm:items-center',
        file ? 'border-solid border-emerald-200 bg-emerald-50/40' : drag ? 'border-primary bg-accent' : shownError ? 'border-destructive/50 bg-red-50/40' : 'border-border bg-muted/30'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className={cn('flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg', file ? 'bg-white ring-1 ring-emerald-200' : 'bg-card ring-1 ring-border')}>
          {preview ? <img src={preview} alt="" className="size-full object-cover" /> : file ? <FileText className="size-5 text-emerald-700" /> : <FileUp className="size-5 text-muted-foreground" />}
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
            {doc.label}
            {required ? <span className="text-destructive">*</span> : <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Optional{employment ? ` for ${employment}` : ''}</span>}
          </p>
          {file ? (
            <p className="truncate text-xs text-emerald-800"><Check className="mr-1 inline size-3.5" />{file.name} · {formatBytes(file.size)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{doc.hint} · drag & drop or browse</p>
          )}
          {shownError && !file && <p className="mt-0.5 text-xs font-medium text-destructive">{shownError}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <input ref={input} type="file" accept={DOC_ACCEPT} className="sr-only" onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} aria-label={`Upload ${doc.label}`} />
        <Button type="button" size="sm" variant={file ? 'outline' : 'default'} onClick={() => input.current?.click()}>
          {file ? <><RefreshCw /> Replace</> : <><FileUp /> Upload</>}
        </Button>
        {file && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} aria-label={`Remove ${doc.label}`}><Trash2 className="text-destructive" /></Button>
        )}
      </div>
    </div>
  )
}

function ReviewBlock({ title, rows, onEdit }) {
  return (
    <div className="rounded-xl border">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
        <p className="text-sm font-bold">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-primary hover:underline">Edit</button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="break-words text-sm font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function SubmittedScreen({ result, onTrack }) {
  const { app, areaAgents } = result
  return (
    <div className="mx-auto max-w-lg py-6 text-center animate-fade-up">
      <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-success/20 animate-pulse-ring" />
        <span className="relative flex size-20 items-center justify-center rounded-full bg-success text-white shadow-lg shadow-emerald-600/30">
          <Check className="size-10" strokeWidth={3} />
        </span>
      </div>
      <h1 className="text-2xl font-extrabold">Application submitted!</h1>
      <p className="mt-2 text-muted-foreground">
        Your application <b className="text-foreground">{app.id}</b> for <b className="text-foreground">{formatINR(app.amount)}</b> has been received.
      </p>

      <Card className="mt-6 text-left">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', areaAgents ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-600')}>
              {areaAgents ? <Briefcase className="size-5" /> : <AlertTriangle className="size-5" />}
            </span>
            <div>
              <p className="font-bold">{areaAgents ? `Shared with ${areaAgents} agent${areaAgents > 1 ? 's' : ''} in your area` : 'Sent to our manager'}</p>
              <p className="text-sm text-muted-foreground">
                {areaAgents
                  ? "The first agent to accept your application will verify your details. You'll see their name in your tracker."
                  : "No agent covers your area yet. Our manager can see your application, and you'll be notified when an agent accepts it."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={onTrack}>Track application <ArrowRight /></Button>
        <Button size="lg" variant="outline" asChild><Link to="/customer">Back to dashboard</Link></Button>
      </div>
    </div>
  )
}
