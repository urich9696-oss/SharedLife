import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppLogo } from '@/components/shared/AppLogo'
import { OnlineStatusBanner } from '@/components/shared/OnlineStatusBanner'
import { SyncStatusIndicator } from '@/components/shared/SyncStatusIndicator'
import { IconButton } from '@/components/ui/IconButton'
import { CreateEntitySheet } from '@/features/entities/CreateEntitySheet'
import { cn } from '@/lib/utilities/cn'
import type { ReactNode } from 'react'

const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/planen',
    label: 'Planen',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/erinnerungen',
    label: 'Erinnerungen',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
  {
    to: '/wir',
    label: 'Wir',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="9" cy="7" r="3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" strokeLinecap="round" />
        <path d="M14 20c0-2 1.5-3.5 3.5-3.5" strokeLinecap="round" />
      </svg>
    ),
  },
] as const

function NavItem({
  to,
  label,
  icon,
  end,
}: {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors duration-200',
          'lg:flex-row lg:gap-3 lg:px-4 lg:py-3 lg:text-sm',
          isActive ? 'text-primary' : 'text-text-muted hover:text-text hover:bg-sand/20',
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

export function AppShell() {
  const [createOpen, setCreateOpen] = useState(false)
  const location = useLocation()
  const isAuthRoute = location.pathname.startsWith('/login')

  if (isAuthRoute) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-dvh bg-bg">
      <OnlineStatusBanner />

      <aside
        className={cn(
          'hidden lg:flex lg:w-[var(--nav-side-width)] lg:flex-col',
          'border-r border-border bg-surface',
          'pt-[var(--space-safe-top)] pb-[var(--space-safe-bottom)]',
        )}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <AppLogo />
          <SyncStatusIndicator compact />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-4" aria-label="Hauptnavigation">
          {navItems.map((item) => (
            <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} end={item.to === '/'} />
          ))}
        </nav>
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-medium text-surface shadow-sm transition-colors hover:bg-accent-hover"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Neu erstellen
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header
          className={cn(
            'flex items-center justify-between border-b border-border bg-surface/80 px-4 backdrop-blur-sm lg:hidden',
            'h-[var(--header-height)] pt-[var(--space-safe-top)]',
          )}
        >
          <AppLogo size="sm" />
          <SyncStatusIndicator compact />
        </header>

        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'pb-[calc(var(--nav-bottom-height)+var(--space-safe-bottom))] lg:pb-[var(--space-safe-bottom)]',
          )}
        >
          <Outlet />
        </main>

        <nav
          className={cn(
            'fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border bg-surface/95 backdrop-blur-md lg:hidden',
            'pb-[var(--space-safe-bottom)]',
          )}
          aria-label="Hauptnavigation"
        >
          <div className="relative mx-auto grid h-[var(--nav-bottom-height)] max-w-lg grid-cols-5 items-end px-2">
            {navItems.slice(0, 2).map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} end={item.to === '/'} />
            ))}

            <div className="flex justify-center">
              <IconButton
                label="Neu erstellen"
                size="lg"
                variant="accent"
                className="relative -top-4 shadow-md"
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                }
                onClick={() => setCreateOpen(true)}
              />
            </div>

            {navItems.slice(2).map((item) => (
              <NavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
            ))}
          </div>
        </nav>
      </div>

      <CreateEntitySheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
