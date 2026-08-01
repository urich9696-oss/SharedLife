import { useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppLogo } from '@/components/shared/AppLogo'
import { OnlineStatusBanner } from '@/components/shared/OnlineStatusBanner'
import { SyncStatusIndicator } from '@/components/shared/SyncStatusIndicator'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/features/auth/AuthProvider'
import { CreateEntitySheet } from '@/features/entities/CreateEntitySheet'
import { getGreeting } from '@/features/home/relevance'
import { MoreSheet } from '@/features/modules/MoreSheet'
import { MODULE_REGISTRY } from '@/features/modules/module-registry'
import { MediaImage } from '@/features/media/MediaImage'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { cn } from '@/lib/utilities/cn'

const mobileNav = [
  {
    to: '/',
    label: 'Home',
    end: true,
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
] as const

function NavItem({
  to,
  label,
  icon,
  end,
  dense,
}: {
  to: string
  label: string
  icon?: ReactNode
  end?: boolean
  dense?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-[16px] px-3 py-2.5 text-sm font-medium transition duration-200',
          dense ? 'flex-col gap-1 px-2 py-2 text-[11px]' : '',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-text-muted hover:bg-surface-soft hover:text-text',
        )
      }
    >
      {icon}
      <span className={cn(dense && 'max-w-[4.5rem] truncate text-center')}>{label}</span>
    </NavLink>
  )
}

export function AppShell() {
  const [createOpen, setCreateOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const { profile } = useAuth()
  const { data: pair } = usePairProfile()
  const greeting = useMemo(() => getGreeting(new Date(), profile?.displayName), [profile?.displayName])
  const togetherDays = daysTogether(pair?.togetherSince ?? null)
  const isAuthRoute = location.pathname.startsWith('/login')

  if (isAuthRoute) {
    return <Outlet />
  }

  const sidebarModules = MODULE_REGISTRY.filter((m) => m.key !== 'settings')

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
        <div className="px-6 py-5">
          <AppLogo />
          <p className="mt-2 text-xs text-text-muted">Unser gemeinsames Leben</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3" aria-label="Hauptnavigation">
          {sidebarModules.map((mod) => (
            <NavItem
              key={mod.key}
              to={mod.path}
              label={mod.label}
              end={mod.path === '/'}
            />
          ))}
          <NavItem to="/settings" label="Einstellungen" />
        </nav>

        <div className="space-y-3 border-t border-border px-4 py-4">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex w-full min-h-11 items-center justify-center gap-2 rounded-[18px] bg-emotional px-4 py-3 text-sm font-medium text-surface shadow-sm transition duration-200 hover:bg-accent-hover active:scale-[0.98]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Neu erstellen
          </button>

          <NavLink
            to="/settings/pair"
            className="flex items-center gap-3 rounded-[18px] border border-border bg-surface-soft/60 p-3 transition hover:bg-surface-soft"
          >
            <div className="flex -space-x-2">
              <div className="size-9 overflow-hidden rounded-full border-2 border-surface bg-sand/40">
                {pair?.partnerAAvatarPath ? (
                  <MediaImage
                    storagePath={pair.partnerAAvatarPath}
                    alt={pair.partnerAName}
                    aspectRatio={1}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs font-semibold text-text">
                    {(pair?.partnerAName ?? 'D').slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="size-9 overflow-hidden rounded-full border-2 border-surface bg-primary/20">
                {pair?.partnerBAvatarPath ? (
                  <MediaImage
                    storagePath={pair.partnerBAvatarPath}
                    alt={pair.partnerBName}
                    aspectRatio={1}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs font-semibold text-text">
                    {(pair?.partnerBName ?? 'L').slice(0, 1)}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text">
                {pair?.partnerAName ?? 'Dennis'} & {pair?.partnerBName ?? 'Lea'}
              </p>
              <p className="text-xs text-text-muted">
                {togetherDays !== null ? `${togetherDays} gemeinsame Tage` : 'Paarprofil'}
              </p>
            </div>
          </NavLink>
          <div className="flex justify-end">
            <SyncStatusIndicator compact />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header
          className={cn(
            'flex items-center justify-between gap-3 border-b border-border/80 bg-bg/90 px-4 backdrop-blur-sm lg:hidden',
            'min-h-[var(--header-height)] pt-[var(--space-safe-top)]',
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text">{greeting}</p>
            <p className="truncate text-xs text-text-muted">
              {pair ? `${pair.partnerAName} & ${pair.partnerBName}` : 'SharedLife'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusIndicator compact />
            <NavLink
              to="/settings/pair"
              className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-border bg-surface"
              aria-label="Paarprofil"
            >
              {pair?.coverMediaPath || pair?.partnerAAvatarPath ? (
                <MediaImage
                  storagePath={pair.coverMediaPath ?? pair.partnerAAvatarPath}
                  alt="Paarprofil"
                  aspectRatio={1}
                  className="rounded-full"
                  lazy={false}
                />
              ) : (
                <span className="text-xs font-semibold text-primary">SL</span>
              )}
            </NavLink>
          </div>
        </header>

        <main
          className={cn(
            'flex-1 overflow-y-auto',
            'pb-[calc(var(--nav-bottom-height)+var(--space-safe-bottom)+0.5rem)] lg:pb-[var(--space-safe-bottom)]',
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
          <div className="relative mx-auto grid h-[var(--nav-bottom-height)] max-w-lg grid-cols-5 items-end px-1">
            {mobileNav.slice(0, 2).map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                end={'end' in item ? item.end : false}
                dense
              />
            ))}

            <div className="flex justify-center">
              <IconButton
                label="Neu erstellen"
                size="lg"
                variant="accent"
                className="relative -top-4 min-h-14 min-w-14 shadow-md transition duration-200 active:scale-95"
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                }
                onClick={() => setCreateOpen(true)}
              />
            </div>

            <NavItem
              to={mobileNav[2].to}
              label={mobileNav[2].label}
              icon={mobileNav[2].icon}
              dense
            />

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-2 text-[11px] font-medium transition duration-200',
                moreOpen || location.pathname.startsWith('/module') || location.pathname.startsWith('/settings') || location.pathname === '/wir'
                  ? 'text-primary'
                  : 'text-text-muted',
              )}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <circle cx="5" cy="12" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="19" cy="12" r="1.5" />
              </svg>
              <span>Mehr</span>
            </button>
          </div>
        </nav>
      </div>

      <CreateEntitySheet open={createOpen} onClose={() => setCreateOpen(false)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
