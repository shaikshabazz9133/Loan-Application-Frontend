import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { applicationsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { PublicLayout, lastApplication, rememberApplication } from '@/components/shared/PublicLayout'

/** Look up an application with its ID + the mobile number used to apply. */
export default function Track() {
  const navigate = useNavigate()
  const last = lastApplication()
  const [id, setId] = useState(last?.id || '')
  const [mobile, setMobile] = useState(last?.mobile || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!id.trim() || mobile.length !== 10) return setError('Enter your application ID and 10-digit mobile number.')
    setLoading(true)
    try {
      const status = await applicationsApi.track(id.trim(), mobile)
      rememberApplication(status.id, mobile)
      navigate(`/status/${status.id}`, { state: { status, mobile } })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-extrabold">Track your application</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use the application ID you got after applying (for example LN-1001).</p>
        <Card className="mt-6">
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={submit} className="space-y-4" noValidate>
              <Field label="Application ID" htmlFor="appId">
                <Input id="appId" placeholder="LN-1001" className="uppercase" value={id} onChange={(e) => setId(e.target.value.toUpperCase())} />
              </Field>
              <Field label="Mobile number" htmlFor="mobile">
                <Input id="mobile" inputMode="numeric" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </Field>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <>Check status <ArrowRight /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
