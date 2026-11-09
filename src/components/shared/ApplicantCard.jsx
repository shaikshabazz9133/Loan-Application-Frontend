import { Briefcase, Cake, Calendar, CalendarClock, CreditCard, Fingerprint, Gauge, Hash, IndianRupee, Mail, MapPin, Percent, Phone, Target, User, Wallet } from 'lucide-react'
import { formatDate, formatDateTime, formatINR } from '@/lib/utils'
import { MAX_FOIR, ageFrom, creditBand, emiOf, maskAadhaar, maskPan, tenureLabel } from '@/lib/kyc'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InfoGrid } from './InfoGrid'

export function ApplicantCard({ app }) {
  const emi = emiOf(app)
  const foir = app.income ? emi / app.income : 0
  const band = creditBand(app.creditScore)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer application</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Highlight label="Loan amount" value={formatINR(app.amount)} icon={IndianRupee} tone="bg-teal-50 text-teal-700" />
          <Highlight label="Tenure" value={`${app.tenure} months`} icon={CalendarClock} tone="bg-sky-50 text-sky-700" />
          <Highlight label="Monthly EMI" value={formatINR(emi)} icon={Wallet} tone="bg-indigo-50 text-indigo-700" />
          <Highlight label="EMI / income" value={`${Math.round(foir * 100)}%`} icon={Target} tone={foir > MAX_FOIR ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'} />
        </div>
        <InfoGrid
          items={[
            ['Customer name', app.fullName, User],
            ['Application ID', app.id, Hash],
            ['Date of birth', `${formatDate(app.dob)} (${ageFrom(app.dob)} yrs)`, Cake],
            ['Credit score', app.creditScore != null ? <span key="cs" className="inline-flex items-center gap-2 tabular">{app.creditScore} <Badge variant={band.tone}>{band.label}</Badge></span> : '—', Gauge],
            ['Interest rate', app.interestRatePa != null ? `${app.interestRatePa}% p.a.` : '—', Percent],
            ['Aadhaar number', maskAadhaar(app.aadhaar), Fingerprint],
            ['PAN number', maskPan(app.pan), CreditCard],
            ['Mobile number', app.mobile, Phone],
            ['Email', app.email, Mail],
            ['Loan purpose', app.purpose, Target],
            ['Loan tenure', tenureLabel(app.tenure), CalendarClock],
            ['Monthly income', formatINR(app.income), Wallet],
            ['Employment type', app.employment, Briefcase],
            ['Customer address', `${app.address}, ${app.city} - ${app.pincode}`, MapPin],
            ['Application date', formatDateTime(app.createdAt), Calendar],
          ]}
        />
      </CardContent>
    </Card>
  )
}

function Highlight({ label, value, icon: Icon, tone }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <span className={`flex size-9 items-center justify-center rounded-lg ${tone}`}><Icon className="size-4" /></span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-extrabold tabular">{value}</p>
      </div>
    </div>
  )
}
