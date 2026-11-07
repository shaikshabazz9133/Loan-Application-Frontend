import { useState } from 'react'
import { AlertTriangle, Eye, EyeOff, FileCheck2, FileX2, MessageSquarePlus, ShieldCheck, UserCheck } from 'lucide-react'
import { DOC_TYPES, docCheckKey, fieldChecks, isDocRequired, verificationProgress } from '@/lib/verification'
import { maskAadhaar, maskPan } from '@/lib/kyc'
import { maskAccount } from '@/lib/bank'
import { formatBytes } from '@/lib/docs'
import { cn, formatDateTime } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/misc'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CreditScoreCard } from './CreditScore'
import { DocumentViewer } from './Documents'

/** Credit check + every field and document the agent must verify. Editable for the agent, read-only for the manager. */
export function VerificationPanel({ app, editable, onCheck, onComment, onRunCredit, onRejectCredit }) {
  const [text, setText] = useState('')
  const [reveal, setReveal] = useState({})
  const [viewing, setViewing] = useState(null)
  const checks = app.verification.checks || {}
  const { done, total, complete } = verificationProgress(app)
  const creditLow = app.creditCheck && app.creditCheck.score < 650
  const canTick = editable && !creditLow

  const masked = (key, value) =>
    key === 'aadhaar' ? maskAadhaar(app.aadhaar) : key === 'pan' ? maskPan(app.pan) : key === 'bank' && app.bank ? value.replace(app.bank.account, maskAccount(app.bank.account)) : value

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /> Agent verification</CardTitle>
          <CardDescription className="mt-1.5">
            {editable ? 'Check the credit score, then verify every field and document before recommending.' : 'Credit check, field checks and documents verified by the assigned agent.'}
          </CardDescription>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', complete ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-muted-foreground')}>
          {done}/{total}
        </span>
      </CardHeader>
      <CardContent className="space-y-6">
        <Progress value={(done / total) * 100} indicatorClassName={complete ? 'bg-success' : undefined} />

        <CreditScoreCard app={app} canRun={editable} onRun={onRunCredit} onReject={editable ? onRejectCredit : undefined} />

        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><UserCheck className="size-4 text-muted-foreground" /> Customer details</h4>
          <ul className="divide-y rounded-xl border">
            {fieldChecks(app).map((c) => (
              <li key={c.key} className={cn('flex items-start gap-3 p-3', checks[c.key] && 'bg-emerald-50/50')}>
                <Checkbox
                  id={`chk-${c.key}`}
                  className="mt-0.5"
                  checked={!!checks[c.key]}
                  disabled={!canTick}
                  onCheckedChange={(v) => onCheck?.(c.key, !!v)}
                  aria-label={`Verified: ${c.label}`}
                />
                <div className="min-w-0 flex-1">
                  <label htmlFor={`chk-${c.key}`} className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</label>
                  <p className="mt-0.5 break-words text-sm font-semibold tabular">{c.sensitive && !reveal[c.key] ? masked(c.key, c.value) : c.value}</p>
                  {c.warn && <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle className="size-3.5" /> {c.warn}</p>}
                </div>
                {c.sensitive && (
                  <button
                    type="button"
                    onClick={() => setReveal((r) => ({ ...r, [c.key]: !r[c.key] }))}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label={reveal[c.key] ? `Hide ${c.label}` : `Show ${c.label}`}
                  >
                    {reveal[c.key] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><FileCheck2 className="size-4 text-muted-foreground" /> Documents</h4>
          <ul className="divide-y rounded-xl border">
            {DOC_TYPES.map((d) => {
              const meta = app.documents?.[d.key]
              const required = isDocRequired(d, app.employment)
              const key = docCheckKey(d.key)
              return (
                <li key={d.key} className={cn('flex items-center gap-3 p-3', checks[key] && 'bg-emerald-50/50')}>
                  <Checkbox checked={!!checks[key]} disabled={!canTick || !meta || !required} onCheckedChange={(v) => onCheck?.(key, !!v)} aria-label={`Verified: ${d.label}`} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {d.label}
                      {required ? <Badge variant="slate">Required</Badge> : <Badge variant="outline">Not required · {app.employment}</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{meta ? `${meta.name} · ${formatBytes(meta.size)}` : d.hint}</p>
                  </div>
                  {meta ? (
                    <Button size="sm" variant="outline" onClick={() => setViewing(d.key)}><Eye /> View</Button>
                  ) : (
                    <span className={cn('flex items-center gap-1 text-xs font-semibold', required ? 'text-destructive' : 'text-muted-foreground')}><FileX2 className="size-3.5" /> Not uploaded</span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <p className="mb-3 text-sm font-bold">Verification comments</p>
          {app.verification.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          <ul className="space-y-3">
            {app.verification.comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar name={c.by} className="size-8 text-[10px]" />
                <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-muted/70 px-3.5 py-2.5">
                  <p className="text-xs font-semibold">{c.by} <span className="font-normal text-muted-foreground">· {formatDateTime(c.at)}</span></p>
                  <p className="mt-0.5 break-words text-sm">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
          {editable && (
            <form
              className="mt-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!text.trim()) return
                onComment(text.trim())
                setText('')
              }}
            >
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a verification note, e.g. 'Visited address, documents verified.'" className="min-h-[72px]" aria-label="Verification comment" />
              <div className="flex justify-end">
                <Button type="submit" size="sm" variant="secondary" disabled={!text.trim()}><MessageSquarePlus /> Add comment</Button>
              </div>
            </form>
          )}
        </section>
      </CardContent>
      <DocumentViewer app={app} docKey={viewing} open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </Card>
  )
}
