import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Bell, Briefcase, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { STATUS } from '@/lib/constants'
import { Logo } from '@/components/shared/Logo'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SheetContent } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const ROLE_LABEL = { agent: 'Field Agent', manager: 'Branch Manager' }
const ROLE_ICON = { agent: Briefcase, manager: ShieldCheck }

function useNav() {
  const { currentUser: me, applications } = useStore()
  if (me.role === 'agent') {
    const fresh = applications.filter((a) => a.status === STATUS.UNASSIGNED).length
    return [
      { to: '/agent', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/agent/applications', label: 'Applications', icon: FileText, badge: fresh },
    ]
  }
  const needs = applications.filter((a) => a.status === STATUS.AGENT_APPROVED || a.status === STATUS.APPROVED).length
  return [
    { to: '/manager', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/manager/applications', label: 'Applications', icon: FileText, badge: needs },
    { to: '/manager/customers', label: 'Customers', icon: Users },
    { to: '/manager/agents', label: 'Agents', icon: Briefcase },
  ]
}

function Sidebar({ onNavigate }) {
  const { currentUser: me } = useStore()
  const nav = useNav()
  const RoleIcon = ROLE_ICON[me.role]
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pb-4 pt-5">
        <Logo light />
      </div>
      <div className="mx-4 mb-4 flex items-center gap-2 rounded-lg bg-sidebar-accent/70 px-3 py-2 text-xs font-semibold text-sidebar-muted">
        <RoleIcon className="size-4 text-teal-400" />
        {ROLE_LABEL[me.role]} portal
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                isActive ? 'bg-white/10 text-white shadow-inner' : 'text-sidebar-muted hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('size-[18px]', isActive ? 'text-teal-400' : '')} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? <span className="rounded-full bg-teal-500 px-2 py-0.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="m-3 rounded-xl border border-white/10 bg-gradient-to-br from-teal-500/20 to-transparent p-4">
        <p className="text-sm font-bold text-white">Need help?</p>
        <p className="mt-1 text-xs text-sidebar-muted">Support is available Mon–Sat, 9am–7pm.</p>
        <p className="mt-2 text-xs font-semibold text-teal-300">1800-000-0000</p>
      </div>
    </div>
  )
}

export default function AppShell() {
  const { currentUser: me, logout, refresh } = useStore()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <SheetContent aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </DialogPrimitive.Root>

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative" onClick={() => toast('You are all caught up', { description: 'No new notifications.' })}>
            <Bell className="size-5" />
            <span className="absolute right-2 top-2 size-2 rounded-full bg-teal-500 ring-2 ring-background" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar name={me.name} />
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-bold leading-tight">{me.name}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_LABEL[me.role]}</span>
                </span>
                <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <span className="block text-sm font-bold text-foreground">{me.name}</span>
                <span className="block truncate font-normal">{me.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => refresh().then(() => toast.success('Up to date')).catch((e) => toast.error(e.message))}>
                <RefreshCw /> Refresh data
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive [&_svg]:text-destructive"
                onSelect={() => {
                  logout()
                  navigate('/login')
                }}
              >
                <LogOut /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
