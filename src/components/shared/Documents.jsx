import { useEffect, useState } from 'react'
import { Download, Eye, FileText, ImageIcon, Loader2 } from 'lucide-react'
import { getDoc, formatBytes, sampleDocSvg } from '@/lib/docs'
import { DOC_TYPES } from '@/lib/verification'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const docLabel = (key) => DOC_TYPES.find((d) => d.key === key)?.label || key

/** Opens an uploaded document (from IndexedDB) or a generated sample for demo data. */
export function DocumentViewer({ app, docKey, open, onOpenChange }) {
  const meta = app.documents?.[docKey]
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !meta) {
      setUrl(null)
      return
    }
    let objectUrl
    setUrl(null)
    setError('')
    if (meta.sample) {
      setUrl(sampleDocSvg(docLabel(docKey), app.fullName, app.id))
      return
    }
    getDoc(meta.key)
      .then((blob) => {
        if (!blob) return setError('This file is not available on this device. (Demo files are stored in the browser that uploaded them.)')
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => setError('Could not open the file.'))
    return () => objectUrl && URL.revokeObjectURL(objectUrl)
  }, [open, meta, docKey, app.fullName, app.id])

  const isPdf = meta?.type === 'application/pdf' && !meta?.sample
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{docLabel(docKey)}</DialogTitle>
          <DialogDescription>{meta ? `${meta.name} · ${formatBytes(meta.size)}${meta.sample ? ' · sample' : ''}` : 'Not uploaded'}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl border bg-muted/50">
          {error ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{error}</p>
          ) : !url ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : isPdf ? (
            <iframe src={url} title={docLabel(docKey)} className="h-[65vh] w-full bg-white" />
          ) : (
            <img src={url} alt={docLabel(docKey)} className="max-h-[65vh] w-auto object-contain" />
          )}
        </div>
        {url && meta && (
          <div className="flex justify-end">
            <Button variant="outline" asChild>
              <a href={url} download={meta.sample ? `${docKey}-sample.svg` : meta.name}><Download /> Download</a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Read-only list of uploaded documents with a View button. */
export function DocumentList({ app }) {
  const [viewing, setViewing] = useState(null)
  const entries = DOC_TYPES.filter((d) => app.documents?.[d.key])
  if (!entries.length) return <p className="text-sm text-muted-foreground">No documents uploaded.</p>
  return (
    <>
      <ul className="space-y-2">
        {entries.map((d) => {
          const m = app.documents[d.key]
          return (
            <li key={d.key} className="flex items-center gap-3 rounded-lg border p-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                {m.type === 'application/pdf' ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{d.label}</p>
                <p className="truncate text-xs text-muted-foreground">{m.name} · {formatBytes(m.size)}</p>
              </div>
              <Button size="sm" variant="ghost" className="shrink-0 px-2.5" onClick={() => setViewing(d.key)} aria-label={`View ${d.label}`}>
                <Eye /> <span className="hidden sm:inline lg:hidden 2xl:inline">View</span>
              </Button>
            </li>
          )
        })}
      </ul>
      <DocumentViewer app={app} docKey={viewing} open={!!viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </>
  )
}
