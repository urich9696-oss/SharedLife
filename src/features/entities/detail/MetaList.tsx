import type { ReactNode } from 'react'
import { cn } from '@/lib/utilities/cn'

export function MetaList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <dl
      className={cn(
        'overflow-hidden rounded-lg border border-border/70 bg-surface shadow-xs',
        className,
      )}
    >
      {children}
    </dl>
  )
}

export function MetaRow({
  label,
  value,
  last,
}: {
  label: string
  value: ReactNode
  last?: boolean
}) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-6 px-6 py-4',
        !last && 'border-b border-border/70',
      )}
    >
      <dt className="text-sm font-medium text-text-muted">{label}</dt>
      <dd className="text-right text-[17px] text-text">{value}</dd>
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-4 text-xl font-bold tracking-[-0.025em] text-text">{children}</h2>
  )
}
