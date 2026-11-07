import { useState } from 'react'
import { BadgeCheck, Check, Copy, Landmark, PartyPopper, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { STATUS } from '@/lib/constants'
import { bankLabel, maskAccount } from '@/lib/bank'
import { cn, formatDate, formatDateTime, formatINR } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function CopyUtr({ utr }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(utr).then(() => {
          setCopied(true)
          toast.success('UTR copied')
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="inline-flex items-center gap-1.5 rounded-md font-mono text-sm font-bold hover:text-primary"
      aria-label="Copy UTR"
    >
      {utr} {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 opacity-60" />}
    </button>
  )
}

/** Bank account on file + disbursement status/receipt. Used by customer and manager. */
export function DisbursementCard({ app, showFullAccount = false, action }) {
  const b = app.bank
  const d = app.disbursement
  if (!b) return null
  const rows = [
    ['Account holder', b.holder],
    ['Bank', b.bankName],
    ['Account number', showFullAccount ? b.account : maskAccount(b.account)],
    ['IFSC', b.ifsc],
    ['Account type', b.type],
  ]
  return (
    <Card className={cn(d && 'border-emerald-200')}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2"><Landmark className="size-5 text-primary" /> {d ? 'Disbursement receipt' : 'Disbursement account'}</CardTitle>
        {d ? <Badge variant="success"><Check className="size-3" /> Credited</Badge> : app.status === STATUS.APPROVED ? <Badge variant="info">Ready to send</Badge> : <Badge variant="slate">After approval</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        {d && (
          <div className="rounded-xl bg-emerald-50 p-4 text-emerald-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Amount sent</p>
            <p className="mt-0.5 text-2xl font-extrabold tabular">{formatINR(d.amount)}</p>
            <p className="text-sm">to {bankLabel(b)} · {d.mode}</p>
            <div className="mt-3 border-t border-emerald-200 pt-3 text-sm">
              <p className="text-xs text-emerald-700">UTR / transaction reference</p>
              <CopyUtr utr={d.utr} />
              <p className="mt-1 text-xs text-emerald-700">{formatDateTime(d.at)} · by {d.by}</p>
            </div>
          </div>
        )}
        <dl className="divide-y rounded-xl border text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate text-right font-semibold tabular">{v}</dd>
            </div>
          ))}
        </dl>
        {!d && <p className="text-xs text-muted-foreground">{app.status === STATUS.APPROVED ? 'The approved amount will be transferred to this account.' : 'The loan amount is transferred to this account once approved.'}</p>}
        {action}
      </CardContent>
    </Card>
  )
}

/** Big outcome banner for the customer once a decision is made. */
export function LoanOutcomeBanner({ app }) {
  const s = app.status
  if (s === STATUS.DISBURSED)
    return (
      <Banner tone="success" icon={PartyPopper} title="Loan approved & amount sent!">
        <b className="tabular">{formatINR(app.disbursement.amount)}</b> has been sent to your <b>{bankLabel(app.bank)}</b> account on {formatDate(app.disbursement.at)} via {app.disbursement.mode}.
        <span className="mt-1 block text-xs opacity-80">UTR {app.disbursement.utr} · it may take up to 2 hours to reflect in your account.</span>
      </Banner>
    )
  if (s === STATUS.APPROVED)
    return (
      <Banner tone="success" icon={BadgeCheck} title="Congratulations, your loan is approved!">
        <b className="tabular">{formatINR(app.amount)}</b> will be sent to your <b>{bankLabel(app.bank)}</b> account shortly. You'll see the transfer reference here once it's sent.
      </Banner>
    )
  if (s === STATUS.REJECTED || s === STATUS.AGENT_REJECTED)
    return (
      <Banner tone="danger" icon={XCircle} title="Your loan application was not approved">
        Reason: {(app.managerDecision || app.agentDecision)?.reason || 'Not specified'}. You can apply again after addressing the reason above.
      </Banner>
    )
  return null
}

function Banner({ tone, icon: Icon, title, children }) {
  return (
    <div
      className={cn(
        'mb-6 flex items-start gap-4 rounded-2xl border p-5 animate-fade-up',
        tone === 'success' ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-card text-emerald-900' : 'border-red-200 bg-gradient-to-r from-red-50 to-card text-red-900'
      )}
      role="status"
    >
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-white', tone === 'success' ? 'bg-success' : 'bg-destructive')}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold">{title}</p>
        <p className="mt-0.5 text-sm">{children}</p>
      </div>
    </div>
  )
}

