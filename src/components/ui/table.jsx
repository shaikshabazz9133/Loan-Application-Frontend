import * as React from 'react'
import { cn } from '@/lib/utils'

export const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto scrollbar-thin">
    <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
))
export const TableHeader = ({ className, ...props }) => <thead className={cn('bg-muted/60 [&_tr]:border-b', className)} {...props} />
export const TableBody = ({ className, ...props }) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
export const TableRow = ({ className, ...props }) => (
  <tr className={cn('border-b transition-colors hover:bg-muted/40', className)} {...props} />
)
export const TableHead = ({ className, ...props }) => (
  <th className={cn('h-11 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)} {...props} />
)
export const TableCell = ({ className, ...props }) => <td className={cn('whitespace-nowrap px-4 py-3 align-middle', className)} {...props} />
