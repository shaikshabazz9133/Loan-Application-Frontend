import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

/**
 * columns: [{ key, header, cell: (row) => node, className, mobile?: boolean }]
 * Renders a table on md+ and stacked cards on mobile.
 */
export function DataTable({ columns, rows, rowHref, empty, mobileCard }) {
  const navigate = useNavigate()
  if (!rows.length) return empty
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((c) => (
                <TableHead key={c.key} className={c.headClassName}>{c.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className={cn(rowHref && 'cursor-pointer')}
                onClick={(e) => {
                  if (!rowHref || e.target.closest('button,a,[role=switch],[role=menuitem]')) return
                  navigate(rowHref(r))
                }}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>{c.cell(r)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y md:hidden">
        {rows.map((r) => (
          <div
            key={r.id}
            className={cn('p-4', rowHref && 'cursor-pointer active:bg-muted/50')}
            onClick={(e) => {
              if (!rowHref || e.target.closest('button,a,[role=switch],[role=menuitem]')) return
              navigate(rowHref(r))
            }}
          >
            {mobileCard(r)}
          </div>
        ))}
      </div>
    </>
  )
}
