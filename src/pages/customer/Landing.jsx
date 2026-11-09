import { Link } from 'react-router-dom'
import { ArrowRight, Clock, FileCheck2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicLayout, lastApplication } from '@/components/shared/PublicLayout'

/** "/" - one clear action: apply. Tracking is a secondary link. */
export default function Landing() {
  const last = lastApplication()
  return (
    <PublicLayout>
      <section className="py-10 text-center sm:py-16">
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
          Get a personal loan,
          <br />
          <span className="text-primary">without the paperwork run-around.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Apply in about 5 minutes. No account needed. See your interest rate before you submit, then track your application with its ID and your mobile number.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="h-12 px-8 text-base" asChild>
            <Link to="/apply">Apply for loan <ArrowRight /></Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-6" asChild>
            <Link to={last ? `/status/${last.id}` : '/track'}><Search /> {last ? `Check ${last.id}` : 'Track my application'}</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          [FileCheck2, 'Keep these ready', 'PAN, Aadhaar, bank account details and statements.'],
          [Clock, 'Rate in seconds', 'Your interest rate and EMI are shown as you fill the form.'],
          [Search, 'Track anytime', 'Use your application ID and mobile number.'],
        ].map(([Icon, title, text]) => (
          <div key={title} className="rounded-xl border bg-card p-4">
            <Icon className="size-5 text-primary" />
            <p className="mt-2 font-bold">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </PublicLayout>
  )
}
