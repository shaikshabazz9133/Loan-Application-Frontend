import { Link } from 'react-router-dom'
import { Logo } from './Logo'

/** Simple header + page body for the customer-facing pages (no account, no sidebar). */
export function PublicLayout({ children, wide = false }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/" aria-label="LendWise home"><Logo /></Link>
          <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-3">
            <Link to="/track" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">Track application</Link>
            <Link to="/login" className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground">Staff sign in</Link>
          </nav>
        </div>
      </header>
      <main className={`mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>{children}</main>
    </div>
  )
}

/** Remembers the last application on this device so "Track" can be pre-filled. */
const LAST_KEY = 'lendwise.lastApplication'
export function rememberApplication(id, mobile) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ id, mobile }))
  } catch {
    /* storage blocked: the customer can still type the id and mobile */
  }
}
export function lastApplication() {
  try {
    return JSON.parse(localStorage.getItem(LAST_KEY) || 'null')
  } catch {
    return null
  }
}
