import type { ComponentType } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { WIDGET_REGISTRY, parseWidgetConfig, type WidgetType } from '@/features/widgets/registry'
import type { WidgetInstanceRow } from '@/lib/indexed-db/schema'

export interface WidgetRendererProps {
  instance: WidgetInstanceRow
  spaceId: string
  entityId?: string | null
}

function UnknownWidget({ instance }: { instance: WidgetInstanceRow }) {
  return (
    <Card padding="md" className="border-dashed border-warning/40 bg-warning/5">
      <CardHeader>
        <CardTitle className="text-base">Unbekanntes Widget</CardTitle>
        <CardDescription>
          Typ „{instance.widget_type}“ wird nicht unterstützt. Inhalt bleibt erhalten.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function InvalidConfigWidget({ label }: { label: string }) {
  return (
    <Card padding="md" className="border-dashed border-danger/40">
      <CardHeader>
        <CardTitle className="text-base">Widget-Konfiguration ungültig</CardTitle>
        <CardDescription>{label}: Einstellungen konnten nicht geladen werden.</CardDescription>
      </CardHeader>
    </Card>
  )
}

function safeParseConfig(type: WidgetType, config: unknown): Record<string, unknown> | null {
  try {
    return parseWidgetConfig(type, config) as Record<string, unknown>
  } catch {
    return null
  }
}

export function WidgetRenderer({ instance, spaceId, entityId }: WidgetRendererProps) {
  const type = instance.widget_type as WidgetType
  const def = WIDGET_REGISTRY[type]

  if (!def) {
    return <UnknownWidget instance={instance} />
  }

  const config = safeParseConfig(type, instance.config)
  if (!config) {
    return <InvalidConfigWidget label={def.label} />
  }

  const Component = def.component as ComponentType<{
    spaceId: string
    entityId?: string | null
    config: Record<string, unknown>
    title?: string | null
  }>

  return (
    <Component
      spaceId={spaceId}
      entityId={entityId ?? instance.entity_id}
      config={config}
      title={instance.title}
    />
  )
}
