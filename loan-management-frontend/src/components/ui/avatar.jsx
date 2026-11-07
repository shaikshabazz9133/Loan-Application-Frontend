import { cn, initials } from '@/lib/utils'

const palette = ['bg-teal-100 text-teal-800', 'bg-indigo-100 text-indigo-800', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-800', 'bg-sky-100 text-sky-800', 'bg-violet-100 text-violet-800', 'bg-emerald-100 text-emerald-800']

export function Avatar({ name = '', className }) {
  const idx = [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % palette.length
  return (
    <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold', palette[idx], className)} aria-hidden="true">
      {initials(name)}
    </span>
  )
}
