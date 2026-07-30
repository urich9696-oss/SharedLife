import type { ReactNode } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'

export function WidgetShell({
  title,
  description,
  children,
  empty,
}: {
  title?: string | null
  description?: string | null
  children?: ReactNode
  empty?: string
}) {
  return (
    <Card padding="md" className="h-full">
      {title ? (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
      ) : null}
      {children ?? (empty ? <p className="text-sm text-text-muted">{empty}</p> : null)}
    </Card>
  )
}
