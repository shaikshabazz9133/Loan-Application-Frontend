import { Badge } from '@/components/ui/badge'
import { STATUS_META } from '@/lib/constants'

export function StatusBadge({ status, audience = 'staff', className }) {
  const meta = STATUS_META[status] || { label: status, variant: 'slate' }
  return (
    <Badge variant={meta.variant} dot className={className}>
      {audience === 'customer' ? meta.customer : meta.label}
    </Badge>
  )
}
