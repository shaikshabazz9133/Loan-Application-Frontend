import { cn } from '@/lib/utils'

export function Logo({ className, light }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-md shadow-teal-900/20">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 5v13h10" />
          <path d="M12 9.5 15 6.5l3 3" opacity=".75" />
        </svg>
      </span>
      <span className={cn('text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-foreground')}>
        Lend<span className="text-teal-500">Wise</span>
      </span>
    </div>
  )
}
