import { useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { WidgetRenderer } from '@/features/widgets/WidgetRenderer'
import { sectionLabelForWidget } from '@/features/content/section-defaults'
import {
  WIDGET_REGISTRY,
  WIDGET_SIZE_GRID,
  listWidgetsForEntityType,
  type WidgetSize,
  type WidgetType,
} from '@/features/widgets/registry'
import {
  createWidgetInstance,
  listWidgetInstancesForEntity,
  reorderWidgetInstances,
  resizeWidgetInstance,
  softDeleteWidgetInstance,
} from '@/features/widgets/widget-repository'
import type { EntityType, WidgetInstanceRow } from '@/lib/indexed-db/schema'
import { useAuth } from '@/app/providers'

export interface WidgetBoardProps {
  spaceId: string
  entityId: string
  entityType: EntityType
  editable?: boolean
}

const SIZE_OPTIONS = [
  { value: 'sm', label: 'Klein' },
  { value: 'md', label: 'Mittel' },
  { value: 'lg', label: 'Gross' },
  { value: 'xl', label: 'Extra gross' },
] as const

function gridSizeFromInstance(instance: WidgetInstanceRow): WidgetSize {
  const match = (Object.entries(WIDGET_SIZE_GRID) as [WidgetSize, { w: number; h: number }][]).find(
    ([, g]) => g.w === instance.grid_w && g.h === instance.grid_h,
  )
  return match?.[0] ?? 'md'
}

export function WidgetBoard({ spaceId, entityId, entityType, editable = true }: WidgetBoardProps) {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const [instances, setInstances] = useState<WidgetInstanceRow[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<WidgetType | ''>('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const rows = await listWidgetInstancesForEntity(spaceId, entityId)
    setInstances(rows)
    setLoading(false)
  }, [spaceId, entityId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const availableWidgets = listWidgetsForEntityType(entityType)

  const handleAdd = async () => {
    if (!selectedType) return
    await createWidgetInstance({
      spaceId,
      entityId,
      widgetType: selectedType,
      userId: session?.userId ?? null,
    })
    setAddOpen(false)
    setSelectedType('')
    await refresh()
    void queryClient.invalidateQueries({ queryKey: ['widgetInstances'] })
  }

  const handleRemove = async (id: string) => {
    await softDeleteWidgetInstance(id, spaceId)
    await refresh()
  }

  const handleMove = async (id: string, direction: -1 | 1) => {
    const idx = instances.findIndex((i) => i.id === id)
    if (idx < 0) return
    const next = idx + direction
    if (next < 0 || next >= instances.length) return
    const ordered = [...instances]
    const [item] = ordered.splice(idx, 1)
    ordered.splice(next, 0, item)
    await reorderWidgetInstances(
      spaceId,
      entityId,
      ordered.map((i) => i.id),
    )
    await refresh()
  }

  const handleResize = async (id: string, size: WidgetSize) => {
    await resizeWidgetInstance(id, spaceId, size)
    await refresh()
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Abschnitte werden geladen…</p>
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl text-text">Abschnitte</h2>
        {editable ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            Abschnitt hinzufügen
          </Button>
        ) : null}
      </div>

      {instances.length === 0 ? (
        <Card padding="md" className="text-center text-sm text-text-muted">
          Noch keine zusätzlichen Abschnitte. Bestehende Notizen und Fotos bleiben sichtbar.
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {instances.map((instance) => (
            <li
              key={instance.id}
              className="relative"
              style={{
                gridColumn: instance.grid_w > 1 ? `span ${Math.min(instance.grid_w, 2)}` : undefined,
              }}
            >
              {editable ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Select
                    value={gridSizeFromInstance(instance)}
                    onChange={(e) => void handleResize(instance.id, e.target.value as WidgetSize)}
                    aria-label="Abschnittsgrösse"
                    className="h-9 text-xs"
                    options={[...SIZE_OPTIONS]}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleMove(instance.id, -1)}
                    aria-label="Nach oben"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleMove(instance.id, 1)}
                    aria-label="Nach unten"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger"
                    onClick={() => void handleRemove(instance.id)}
                  >
                    Entfernen
                  </Button>
                </div>
              ) : null}
              <WidgetRenderer instance={instance} spaceId={spaceId} entityId={entityId} />
            </li>
          ))}
        </ul>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Abschnitt hinzufügen">
        <div className="space-y-4">
          <Select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as WidgetType)}
            aria-label="Abschnittstyp"
            placeholder="Abschnitt wählen…"
            options={availableWidgets.map((w) => ({
              value: w.type,
              label: `${sectionLabelForWidget(entityType, w.type)} — ${w.description}`,
            }))}
          />
          {selectedType ? (
            <p className="text-sm text-text-muted">{WIDGET_REGISTRY[selectedType].description}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" onClick={() => void handleAdd()} disabled={!selectedType}>
              Hinzufügen
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}
