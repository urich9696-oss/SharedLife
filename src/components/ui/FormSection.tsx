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
    <div className={cn('px-5 py-4 sm:px-6', className)} {...props}>
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
    <div className="px-5 pb-3 pt-6 sm:px-6">
      <h3 className="text-sm font-medium text-text-muted">{title}</h3>
      {description ? (
        <p className="mt-[var(--heading-content-gap)] text-sm text-text-muted/80">{description}</p>
      ) : null}
    </div>
  )
}
