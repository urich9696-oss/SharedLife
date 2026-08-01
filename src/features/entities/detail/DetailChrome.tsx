import type { ReactNode } from 'react'
import { Archive, Copy, Pencil, Trash2 } from 'lucide-react'
import {
  AppHeaderDetail,
  type AppHeaderDetailAction,
} from '@/components/shared/AppHeader'
import { cn } from '@/lib/utilities/cn'

export type DetailMenuAction = AppHeaderDetailAction

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
  return (
    <div className={cn('relative', className)}>
      <AppHeaderDetail title={title} menuActions={menuActions} />
      <div className="px-page pt-3">{children}</div>
    </div>
  )
}

export const DETAIL_MENU_ICONS = {
  edit: <Pencil size={18} strokeWidth={1.75} />,
  duplicate: <Copy size={18} strokeWidth={1.75} />,
  archive: <Archive size={18} strokeWidth={1.75} />,
  delete: <Trash2 size={18} strokeWidth={1.75} />,
}
