import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'

/** Confirmation dialog with a text field. `required` makes the reason mandatory. */
export function ReasonDialog({ open, onOpenChange, title, description, label, placeholder, confirmLabel, variant = 'default', required, presets = [], initialText = '', onConfirm }) {
  const [text, setText] = useState('')
  useEffect(() => {
    if (open) setText(initialText)
  }, [open, initialText])
  const [error, setError] = useState('')
  const close = (o) => {
    onOpenChange(o)
    if (!o) setTimeout(() => (setText(''), setError('')), 200)
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (required && text.trim().length < 5) return setError('Please enter a reason (at least 5 characters).')
            try {
              onConfirm(text.trim())
              close(false)
            } catch (err) {
              setError(err.message)
            }
          }}
        >
          <Field label={label} htmlFor="reason" error={error} required={required}>
            <Textarea id="reason" autoFocus value={text} onChange={(e) => (setText(e.target.value), setError(''))} placeholder={placeholder} aria-invalid={!!error} />
          </Field>
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => (setText(p), setError(''))} className="rounded-full border px-2.5 py-1 text-xs font-medium transition hover:border-primary hover:text-primary">
                  {p}
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" variant={variant}>{confirmLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
