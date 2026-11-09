import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, Loader2, PartyPopper, RefreshCw, XCircle } from 'lucide-react'
import { applicationsApi } from '@/lib/api'
import { STATUS, STATUS_META } from '@/lib/constants'
import { cn, formatDateTime, formatINR } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PublicLayout, lastApplication } from '@/components/shared/PublicLayout'
import { StatusTimeline, buildSteps } from '@/components/shared/StatusTimeline'

/** "/status/:id" - the only thing a customer sees after applying: where their application is. */
export default function Status() {
  const { id } = useParams()
  const { state } = useLocation()
  const last = lastApplication()
  const mobile = state?.mobile || (last?.id === id ? last.mobile : null)
  const [status, setStatus] = useState(state?.status || null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStatus(await applicationsApi.track(id, mobile))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, mobile])

  useEffect(() => {
    if (mobile) load()
  }, [mobile, load])

  if (!mobile) return <Navigate to="/track" replace />

  return (
    <PublicLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Application</p>
          <h1 className="text-3xl font-extrabold tabular">{id}</h1>
          {status && <p className="text-sm text-muted-foreground">Applied {formatDateTime(status.createdAt)} · Last update {formatDateTime(status.updatedAt)}</p>}
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertTriangle className="size-6 text-amber-600" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" asChild><Link to="/track">Check the ID and mobile number</Link></Button>
          </CardContent>
        </Card>
      )}

      {!status && !error && <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" aria-label="Loading status" />}

      {status && (
        <div className="space-y-6">
          <Outcome t={status} />
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
              <Figure label="Status" value={STATUS_META[status.status]?.customer || status.status} />
              <Figure label="Loan amount" value={formatINR(status.amount)} />
              <Figure label="Monthly EMI" value={status.emi ? formatINR(status.emi) : '—'} sub={status.interestRatePa ? `${status.interestRatePa}% p.a. · ${status.tenure} months` : `${status.tenure} months`} />
              <Figure label="Paid to" value={status.bankLabel} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <StatusTimeline steps={buildSteps(status)} />
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">Keep your application ID <b>{status.id}</b> to check your status again from any device.</p>
        </div>
      )}
    </PublicLayout>
  )
}

function Figure({ label, value, sub }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/60 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate font-extrabold tabular">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Big banner once there's a final answer. */
function Outcome({ t }) {
  const s = t.status
  let tone, Icon, title, text
  if (s === STATUS.DISBURSED) {
    ;[tone, Icon, title] = ['success', PartyPopper, 'Your loan amount has been sent!']
    text = `${formatINR(t.disbursement.amount)} was sent to ${t.bankLabel} via ${t.disbursement.mode}. It can take up to 2 hours to show in your account.`
  } else if (s === STATUS.APPROVED) {
    ;[tone, Icon, title] = ['success', BadgeCheck, 'Congratulations, your loan is approved!']
    text = `${formatINR(t.amount)} will be sent to ${t.bankLabel} shortly.`
  } else if (s === STATUS.REJECTED || s === STATUS.AGENT_REJECTED) {
    ;[tone, Icon, title] = ['danger', XCircle, 'Your application was not approved']
    text = `Reason: ${(t.managerDecision || t.agentDecision)?.reason || 'Not specified'}.`
  } else return null
  return (
    <div className={cn('flex items-start gap-4 rounded-2xl border p-5', tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900')} role="status">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl text-white', tone === 'success' ? 'bg-success' : 'bg-destructive')}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-lg font-extrabold">{title}</p>
        <p className="mt-0.5 text-sm">{text}</p>
      </div>
    </div>
  )
}
