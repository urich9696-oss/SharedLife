import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Copy, MoreHorizontal, Pencil, Trash2, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utilities/cn'

export interface DetailMenuAction {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  onSelect: () => void
}

export function DetailChrome({
  title,
  menuActions,
  children,
  className,
}: {
  title?: string
  menuActions: DetailMenuAction[]
  children: ReactNode
  className?: string
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className={cn('relative', className)}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-text transition hover:bg-surface-soft"
          aria-label="Zurück"
        >
          <ChevronLeft size={24} strokeWidth={1.75} />
        </button>
        {title ? (
          <p className="truncate text-sm font-medium text-text-muted">{title}</p>
        ) : (
          <span />
        )}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-text transition hover:bg-surface-soft"
            aria-label="Mehr Optionen"
            aria-expanded={open}
          >
            <MoreHorizontal size={22} strokeWidth={1.75} />
          </button>
          {open ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 min-w-[12rem] overflow-hidden rounded-lg border border-border/80 bg-surface shadow-md"
            >
              {menuActions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  role="menuitem"
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3.5 text-left text-[17px]',
                    action.danger ? 'text-error' : 'text-text',
                    'hover:bg-bg',
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
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  )
}

export const DETAIL_MENU_ICONS = {
  edit: <Pencil size={18} strokeWidth={1.75} />,
  duplicate: <Copy size={18} strokeWidth={1.75} />,
  archive: <Archive size={18} strokeWidth={1.75} />,
  delete: <Trash2 size={18} strokeWidth={1.75} />,
}
