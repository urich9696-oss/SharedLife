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
import { getGroupedModules, PRIMARY_NAV } from '@/features/modules/module-registry'
import { MediaImage } from '@/features/media/MediaImage'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { cn } from '@/lib/utilities/cn'

const mobileIcons: Record<string, ReactNode> = {
  home: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
    </svg>
  ),
  planen: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  ),
  erinnerungen: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  ),
}

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
          dense ? 'flex-col gap-0.5 px-1 py-1.5 text-[10px] leading-tight' : '',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-text-muted hover:bg-surface-soft hover:text-text',
        )
      }
    >
      {icon}
      <span className={cn(dense && 'max-w-[4.25rem] truncate text-center')}>{label}</span>
    </NavLink>
  )
}

export function AppShell() {
  const [createOpen, setCreateOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const { data: pair } = usePairProfile()
  const greeting = useMemo(() => getGreeting(new Date(), profile?.displayName), [profile?.displayName])
  const togetherDays = daysTogether(pair?.togetherSince ?? null)
  const isAuthRoute = location.pathname.startsWith('/login')
  const groups = getGroupedModules({ includeSystem: false })

  if (isAuthRoute) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-dvh bg-bg">
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

        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3" aria-label="Hauptnavigation">
          <div className="flex flex-col gap-0.5">
            {PRIMARY_NAV.map((item) => (
              <NavItem
                key={item.key}
                to={item.path}
                label={item.label}
                end={'end' in item ? item.end : false}
              />
            ))}
          </div>

          {groups.map((group) => (
            <div key={group.key}>
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.modules.map((mod) => (
                  <NavItem key={mod.key} to={mod.path} label={mod.label} />
                ))}
              </div>
            </div>
          ))}
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
                <div className="flex size-full items-center justify-center text-xs font-semibold text-text">
                  {(pair?.partnerAName ?? 'D').slice(0, 1)}
                </div>
              </div>
              <div className="size-9 overflow-hidden rounded-full border-2 border-surface bg-primary/20">
                <div className="flex size-full items-center justify-center text-xs font-semibold text-text">
                  {(pair?.partnerBName ?? 'L').slice(0, 1)}
                </div>
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

          <NavItem to="/settings" label="Einstellungen" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="min-h-11 rounded-[16px] px-3 py-2.5 text-left text-sm font-medium text-text-muted hover:bg-surface-soft hover:text-text"
          >
            Abmelden
          </button>
          <div className="flex justify-end">
            <SyncStatusIndicator compact />
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <OnlineStatusBanner />
        <header
          className={cn(
            'flex items-center justify-between gap-3 border-b border-border/80 bg-bg/90 backdrop-blur-sm lg:hidden',
            'min-h-[var(--header-height)] pt-[var(--space-safe-top)]',
            'px-[max(1rem,var(--space-safe-left))] pr-[max(1rem,var(--space-safe-right))]',
          )}
        >
          <div className="min-w-0 py-2">
            <p className="truncate text-sm font-medium text-text">{greeting}</p>
            <p className="truncate text-xs text-text-muted">
              {pair ? `${pair.partnerAName} & ${pair.partnerBName}` : 'SharedLife'}
              {togetherDays !== null ? ` · ${togetherDays} Tage` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
            'mx-auto w-full flex-1 overflow-y-auto',
            'max-w-[var(--phone-content-max)] lg:max-w-none',
            // Extra space so FAB/home-indicator nicht den letzten Inhalt verdecken
            'pb-[calc(var(--nav-bottom-height)+var(--space-safe-bottom)+var(--nav-fab-overlap)+0.75rem)] lg:pb-[var(--space-safe-bottom)]',
            'px-[max(0px,var(--space-safe-left))] pr-[max(0px,var(--space-safe-right))]',
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
          <div className="relative mx-auto grid h-[var(--nav-bottom-height)] max-w-[var(--phone-content-max)] grid-cols-5 items-end px-1">
            {PRIMARY_NAV.slice(0, 2).map((item) => (
              <NavItem
                key={item.key}
                to={item.path}
                label={item.label}
                icon={mobileIcons[item.key]}
                end={'end' in item ? item.end : false}
                dense
              />
            ))}

            <div className="flex justify-center">
              <IconButton
                label="Neu erstellen"
                size="lg"
                variant="accent"
                className="relative -top-3 min-h-[52px] min-w-[52px] shadow-md transition duration-200 active:scale-95"
                icon={
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                }
                onClick={() => setCreateOpen(true)}
              />
            </div>

            <NavItem
              to={PRIMARY_NAV[2].path}
              label="Momente"
              icon={mobileIcons.erinnerungen}
              dense
            />

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 py-1.5 text-[10px] font-medium leading-tight transition duration-200',
                moreOpen ||
                  location.pathname.startsWith('/module') ||
                  location.pathname.startsWith('/settings') ||
                  location.pathname.startsWith('/einkauf') ||
                  location.pathname === '/timeline' ||
                  location.pathname === '/wir'
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
