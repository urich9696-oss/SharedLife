import { useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, CalendarDays, Ellipsis, Home, Plus } from 'lucide-react'
import { AppLogo } from '@/components/shared/AppLogo'
import { OnlineStatusBanner } from '@/components/shared/OnlineStatusBanner'
import { SyncStatusIndicator } from '@/components/shared/SyncStatusIndicator'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/features/auth/AuthProvider'
import { CreateEntitySheet } from '@/features/entities/CreateEntitySheet'
import { MoreSheet } from '@/features/modules/MoreSheet'
import { getGroupedModules, PRIMARY_NAV } from '@/features/modules/module-registry'
import { CoupleAvatars } from '@/features/space/CoupleAvatars'
import { daysTogether, usePairProfile } from '@/features/space/pair-profile'
import { cn } from '@/lib/utilities/cn'

const ICON_STROKE = 1.75

const mobileIcons: Record<string, ReactNode> = {
  home: <Home size={22} strokeWidth={ICON_STROKE} />,
  planen: <CalendarDays size={22} strokeWidth={ICON_STROKE} />,
  erinnerungen: <BookOpen size={22} strokeWidth={ICON_STROKE} />,
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
          'flex min-h-11 items-center gap-4 rounded-[20px] px-4 py-2 text-sm font-medium transition duration-[var(--duration-fast)]',
          dense ? 'flex-col gap-1 px-1 py-2 text-[10px] leading-tight' : '',
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
  const { signOut } = useAuth()
  const { data: pair } = usePairProfile()
  const togetherDays = daysTogether(pair?.togetherSince ?? null)
  const isAuthRoute = location.pathname.startsWith('/login')
  const groups = getGroupedModules({ includeSystem: false })
  // Home / Planen / Momente / Entity-Detail bringen eigenen Top-Chrome inkl. Safe-Area
  const ownsTopChrome =
    location.pathname === '/' ||
    location.pathname === '/planen' ||
    location.pathname === '/erinnerungen' ||
    location.pathname.startsWith('/entities/')

  if (isAuthRoute) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-dvh max-w-[100vw] overflow-x-clip bg-bg">
      <aside
        className={cn(
          'hidden lg:flex lg:w-[var(--nav-side-width)] lg:flex-col',
          'border-r border-border bg-surface',
          'pt-[var(--space-safe-top)] pb-[var(--space-safe-bottom)]',
        )}
      >
        <div className="px-6 py-8">
          <AppLogo />
          <p className="mt-2 text-sm font-medium text-text-muted">Unser gemeinsames Leben</p>
        </div>

        <nav className="flex flex-1 flex-col gap-8 overflow-y-auto px-4" aria-label="Hauptnavigation">
          <div className="flex flex-col gap-1">
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
              <p className="mb-2 px-4 text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.modules.map((mod) => (
                  <NavItem key={mod.key} to={mod.path} label={mod.label} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-4 border-t border-border px-4 py-6">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex w-full min-h-12 items-center justify-center gap-2 rounded-[20px] bg-primary px-4 py-3 text-[17px] font-medium text-surface shadow-sm transition duration-[var(--duration-fast)] hover:bg-primary-hover active:scale-[0.98]"
          >
            <Plus size={20} strokeWidth={ICON_STROKE} />
            Neu erstellen
          </button>

          <NavLink
            to="/settings/pair"
            className="flex items-center gap-3 rounded-[18px] border border-border bg-surface-soft/60 p-3 transition hover:bg-surface-soft"
          >
            <CoupleAvatars
              partnerAName={pair?.partnerAName ?? 'Dennis'}
              partnerBName={pair?.partnerBName ?? 'Lea'}
              partnerAAvatarPath={pair?.partnerAAvatarPath}
              partnerBAvatarPath={pair?.partnerBAvatarPath}
              size="md"
            />
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

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col overflow-x-clip">
        <OnlineStatusBanner />

        <main
          className={cn(
            'mx-auto w-full min-w-0 flex-1 overflow-x-clip overflow-y-auto',
            'max-w-[var(--phone-content-max)] lg:max-w-none',
            // Extra space so FAB/home-indicator nicht den letzten Inhalt verdecken
            'pb-[calc(var(--nav-bottom-height)+var(--space-safe-bottom)+var(--nav-fab-overlap)+0.75rem)] lg:pb-[var(--space-safe-bottom)]',
            'px-[max(0px,var(--space-safe-left))] pr-[max(0px,var(--space-safe-right))]',
            !ownsTopChrome && 'pt-[var(--space-safe-top)]',
          )}
        >
          <Outlet />
        </main>

        <nav
          className={cn(
            'fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border/70 bg-surface/80 backdrop-blur-xl lg:hidden',
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
                className="relative -top-3 min-h-[52px] min-w-[52px] shadow-md transition duration-[var(--duration-fast)] active:scale-95"
                icon={<Plus size={24} strokeWidth={ICON_STROKE} />}
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
                'flex min-h-11 flex-col items-center justify-center gap-1 rounded-[20px] px-1 py-2 text-[10px] font-medium leading-tight transition duration-[var(--duration-fast)]',
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
              <Ellipsis size={22} strokeWidth={ICON_STROKE} />
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
