/** Chart tokens — validated categorical slots + reserved status colors (see dataviz palette). */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a']
export const STATUS_COLOR = { good: '#0ca30c', critical: '#d03b3b', neutral: '#94a3b8' }
export const GRID = '#e5e7eb'
export const AXIS_TICK = { fill: '#6b7280', fontSize: 12 }

export function ChartTooltip({ active, payload, label, valueFormatter = (v) => v }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[150px] rounded-lg border bg-card px-3 py-2 text-xs shadow-lift">
      {label != null && <p className="mb-1.5 font-bold text-foreground">{label}</p>}
      {payload.map((p) => (
        <div key={p.dataKey ?? p.name} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2.5 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
            {p.name}
          </span>
          <span className="font-bold tabular text-foreground">{valueFormatter(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
          {i.value != null && <b className="tabular text-foreground">{i.value}</b>}
        </li>
      ))}
    </ul>
  )
}
