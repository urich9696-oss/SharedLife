import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import { OutlineHeart } from '@/components/shared/AppLogo'
import { useAuth } from '@/features/auth/AuthProvider'
import { getGreeting } from '@/features/home/relevance'
import { usePairProfile } from '@/features/space/pair-profile'
import { cn } from '@/lib/utilities/cn'

/** Horizontal inset — Safe-Area kommt vom AppShell-Main */
const pageGutter = 'px-page'

function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <OutlineHeart className="size-[28px] shrink-0 text-text" />
      <span className="truncate text-[22px] font-semibold leading-none tracking-[-0.03em] text-text">
        SharedLife
      </span>
    </div>
  )
}

function CoupleInitials({
  partnerA,
  partnerB,
  className,
}: {
  partnerA: string
  partnerB: string
  className?: string
}) {
  const a = (partnerA.trim() || 'D').charAt(0).toUpperCase()
  const b = (partnerB.trim() || 'L').charAt(0).toUpperCase()
  return (
    <span
      className={cn(
        'flex size-[38px] shrink-0 items-center justify-center rounded-full',
        'bg-surface-soft text-[12px] font-semibold tracking-wide text-text',
        className,
      )}
      aria-hidden="true"
    >
      {a} · {b}
    </span>
  )
}

function formatCoupleLabel(partnerA?: string | null, partnerB?: string | null): string {
  const a = partnerA?.trim() || 'Dennis'
  const b = partnerB?.trim() || 'Lea'
  // Anzeige wie im Produktbrief: LEA & DENNIS
  return `${b} & ${a}`.toUpperCase()
}

/** Kompakte Markenzeile — erscheint optional beim Scrollen auf Home */
export function CompactBrandBar({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[var(--z-sticky)] lg:hidden',
        'transition-opacity duration-200 ease-[var(--ease-out)]',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          'bg-bg/80 backdrop-blur-xl',
          'pt-[calc(var(--space-safe-top)+0.25rem)]',
          pageGutter,
        )}
      >
        <div className="mx-auto flex h-11 max-w-[var(--phone-content-max)] items-center">
          <BrandMark />
        </div>
      </div>
    </div>
  )
}

export function AppHeaderHome({ className }: { className?: string }) {
  const { profile } = useAuth()
  const { data: pair } = usePairProfile()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [compactVisible, setCompactVisible] = useState(false)

  const partnerA = pair?.partnerAName ?? 'Dennis'
  const partnerB = pair?.partnerBName ?? 'Lea'
  const displayName = profile?.displayName?.trim() || 'Dennis'
  const greeting = getGreeting(new Date(), displayName)
  const coupleLabel = formatCoupleLabel(partnerA, partnerB)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCompactVisible(!entry.isIntersecting)
      },
      { root: null, threshold: 0, rootMargin: '-8px 0px 0px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <CompactBrandBar visible={compactVisible} />
      <header
        className={cn(
          'bg-bg',
          'pt-[calc(var(--space-safe-top)+0.875rem)]',
          pageGutter,
          className,
        )}
      >
        <div className="mx-auto max-w-[var(--phone-content-max)] lg:max-w-none">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            <Link
              to="/settings/pair"
              className="shrink-0 rounded-full outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              aria-label="Paarprofil"
            >
              <CoupleInitials partnerA={partnerA} partnerB={partnerB} />
            </Link>
          </div>

          <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />

          <p className="mt-5 text-[11.5px] font-medium uppercase tracking-[0.14em] text-text-muted">
            {coupleLabel}
          </p>
          <h1 className="mt-1.5 min-h-[2.05em] text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-text">
            {greeting}
          </h1>
          <p className="mt-1 text-[15px] font-normal leading-snug text-text-muted">
            Euer gemeinsames Zuhause
          </p>
        </div>
      </header>
    </>
  )
}

export function AppHeaderMain({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cn(
        'bg-bg',
        'pt-[calc(var(--space-safe-top)+0.875rem)] lg:pt-6',
        pageGutter,
        className,
      )}
    >
      <div className="mx-auto flex max-w-[var(--phone-content-max)] items-start justify-between gap-4 lg:max-w-none">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-text">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-[15px] font-normal text-text-muted">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
    </header>
  )
}

export interface AppHeaderDetailAction {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  onSelect: () => void
}

export function AppHeaderDetail({
  title,
  menuActions = [],
  trailing,
  className,
}: {
  title?: string
  menuActions?: AppHeaderDetailAction[]
  trailing?: ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPos(null)
      return
    }
    const rect = buttonRef.current.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onReposition = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    // Scroll-Container (main) verschiebt den Sticky-Header
    window.addEventListener('scroll', onReposition, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open])

  const menu =
    open && menuPos && menuActions.length > 0
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[var(--z-overlay)] min-w-[12rem] overflow-hidden rounded-lg border border-border/80 bg-surface shadow-md"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            {menuActions.map((action) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3.5 text-left text-[17px]',
                  action.danger ? 'text-error' : 'text-text',
                  'hover:bg-bg active:bg-bg',
                )}
                onClick={() => {
                  setOpen(false)
                  action.onSelect()
                }}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null

  return (
    <header
      className={cn(
        'sticky top-0 z-[var(--z-sticky)] overflow-visible',
        'bg-bg/80 backdrop-blur-xl',
        'pt-[calc(var(--space-safe-top)+0.25rem)]',
        pageGutter,
        className,
      )}
    >
      <div className="mx-auto flex h-12 max-w-[var(--phone-content-max)] items-center gap-2 overflow-visible lg:max-w-none">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text transition hover:bg-surface-soft"
          aria-label="Zurück"
        >
          <ChevronLeft size={24} strokeWidth={1.75} />
        </button>

        <p className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-[-0.02em] text-text">
          {title ?? ''}
        </p>

        <div className="relative flex size-11 shrink-0 items-center justify-center overflow-visible">
          {trailing}
          {!trailing && menuActions.length > 0 ? (
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex size-11 items-center justify-center rounded-full text-text transition hover:bg-surface-soft"
              aria-label="Mehr Optionen"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              <MoreHorizontal size={22} strokeWidth={1.75} />
            </button>
          ) : null}
          {!trailing && menuActions.length === 0 ? (
            <span className="size-11" aria-hidden="true" />
          ) : null}
        </div>
      </div>
      {menu}
    </header>
  )
}
