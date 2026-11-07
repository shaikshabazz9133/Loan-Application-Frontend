import { Gauge, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { MIN_CREDIT_SCORE, creditBand } from '@/lib/kyc'
import { cn, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const MIN = 300
const MAX = 900
// Bands drawn on the gauge (status colors, always paired with a text label).
const BANDS = [
  { from: 300, to: 650, color: '#d03b3b' },
  { from: 650, to: 700, color: '#eda100' },
  { from: 700, to: 750, color: '#2a78d6' },
  { from: 750, to: 900, color: '#0ca30c' },
]

function arc(from, to, r = 80, cx = 100, cy = 100) {
  const a = (v) => Math.PI * (1 - (v - MIN) / (MAX - MIN))
  const p = (v) => [cx + r * Math.cos(a(v)), cy - r * Math.sin(a(v))]
  const [x1, y1] = p(from)
  const [x2, y2] = p(to)
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
}

export function ScoreGauge({ score }) {
  const band = creditBand(score)
  const angle = Math.PI * (1 - (score - MIN) / (MAX - MIN))
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 115" className="w-full" role="img" aria-label={`Credit score ${score}, ${band.label}`}>
        {BANDS.map((b) => <path key={b.from} d={arc(b.from + 2, b.to - 2)} stroke={b.color} strokeWidth="14" fill="none" strokeLinecap="round" opacity=".9" />)}
        <circle cx={100 + 80 * Math.cos(angle)} cy={100 - 80 * Math.sin(angle)} r="9" fill="#fff" stroke="#0f172a" strokeWidth="3" />
        <text x="18" y="114" fontSize="9" fill="#6b7280">300</text>
        <text x="168" y="114" fontSize="9" fill="#6b7280">900</text>
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="text-4xl font-extrabold tabular leading-none">{score}</p>
        <Badge variant={band.tone} className="mt-1.5">{band.label}</Badge>
      </div>
    </div>
  )
}

/** Credit check block: agent can run it once; everyone else sees the result. */
export function CreditScoreCard({ app, canRun, onRun, onReject }) {
  const [loading, setLoading] = useState(false)
  const cc = app.creditCheck
  const band = cc ? creditBand(cc.score) : null

  return (
    <div className={cn('rounded-xl border p-4', band && !band.ok && 'border-red-200 bg-red-50/50')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-bold"><Gauge className="size-4 text-primary" /> Credit score check</p>
          <p className="text-xs text-muted-foreground">Minimum required score: {MIN_CREDIT_SCORE} · PAN {app.pan}</p>
        </div>
        {band && (band.ok ? <Badge variant="success"><ShieldCheck className="size-3" /> Eligible</Badge> : <Badge variant="danger"><ShieldAlert className="size-3" /> Not eligible</Badge>)}
      </div>

      {cc ? (
        <div className="mt-3 grid items-center gap-4 sm:grid-cols-[240px_1fr]">
          <ScoreGauge score={cc.score} />
          <div className="space-y-2 text-sm">
            {band.ok ? (
              <p className="text-emerald-800">Score meets the minimum of {MIN_CREDIT_SCORE}. Continue with field and document verification.</p>
            ) : (
              <>
                <p className="font-semibold text-red-800">Score is below the minimum of {MIN_CREDIT_SCORE}. This loan cannot be approved and must be rejected.</p>
                {onReject && <Button variant="destructive" size="sm" onClick={onReject}>Reject for low credit score</Button>}
              </>
            )}
            <p className="text-xs text-muted-foreground">Checked by {cc.by} · {formatDateTime(cc.fetchedAt)}</p>
          </div>
        </div>
      ) : canRun ? (
        <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Fetch the customer's credit report from the bureau using their PAN.</p>
          <Button
            disabled={loading}
            onClick={() => {
              setLoading(true)
              setTimeout(() => {
                onRun()
                setLoading(false)
              }, 1100)
            }}
          >
            {loading ? <><Loader2 className="animate-spin" /> Fetching report…</> : <><Gauge /> Check credit score</>}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Not checked yet. The assigned agent runs this during verification.</p>
      )}
    </div>
  )
}
