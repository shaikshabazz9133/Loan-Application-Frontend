import { Briefcase, CheckCircle2, MapPin, ShieldCheck, User } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'

const roles = [
  { icon: User, title: 'Customer', text: 'Apply & track', tone: 'from-sky-400/30 text-sky-300' },
  { icon: Briefcase, title: 'Agent', text: 'Review & decide', tone: 'from-indigo-400/30 text-indigo-300' },
  { icon: ShieldCheck, title: 'Manager', text: 'Manage & approve', tone: 'from-teal-400/30 text-teal-300' },
]

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-teal-500/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 size-[26rem] rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative my-auto max-w-lg py-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-teal-200">
            <span className="size-1.5 rounded-full bg-teal-400" /> Loan Management System
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.1] xl:text-5xl">
            Loans made simple,
            <br />
            <span className="bg-gradient-to-r from-teal-300 to-emerald-200 bg-clip-text text-transparent">decisions made faster.</span>
          </h1>
          <p className="mt-4 text-base text-slate-300">One application, three role-based portals. Apply in minutes and get matched with a verified agent near you.</p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {roles.map((r) => (
              <div key={r.title} className={`rounded-2xl border border-white/10 bg-gradient-to-b ${r.tone} to-transparent p-4 backdrop-blur`}>
                <r.icon className="size-5" />
                <p className="mt-3 text-sm font-bold text-white">{r.title}</p>
                <p className="text-xs text-slate-300">{r.text}</p>
              </div>
            ))}
          </div>

          <ul className="mt-8 space-y-2.5 text-sm text-slate-300">
            {[
              [MapPin, 'Auto-assigned to the nearest agent within 2 km'],
              [CheckCircle2, 'Two-step approval: agent verification + manager approval'],
              [ShieldCheck, 'Track every step of your application in real time'],
            ].map(([Icon, t]) => (
              <li key={t} className="flex items-center gap-2.5">
                <Icon className="size-4 text-teal-400" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">© {new Date().getFullYear()} LendWise Finance. All rights reserved.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
