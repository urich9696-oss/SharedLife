import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utilities/cn'

/** Gruppierte Einstellungsfläche — weiße Karte auf gebrochenem Weiß */
export function FormSection({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('form-surface', className)} {...props}>
      {children}
    </div>
  )
}

export function FormRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}

export function FormSectionHeader({
  title,
  description,
}: {
  title: string
  description?: ReactNode
}) {
  return (
    <div className="px-6 pb-2 pt-6">
      <h3 className="text-sm font-medium text-text-muted">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-text-muted/80">{description}</p>
      ) : null}
    </div>
  )
}
