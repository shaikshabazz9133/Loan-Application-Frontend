import * as React from 'react'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('text-sm font-semibold leading-none text-foreground/90', className)} {...props} />
))
Label.displayName = 'Label'

export function Field({ label, htmlFor, error, hint, children, className, required }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
