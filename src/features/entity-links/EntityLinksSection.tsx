import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath, getEntityTypeMeta } from '@/features/entities/entity-types'
import { useEntities } from '@/features/entities/useEntities'
import {
  createEntityLink,
  listLinksForEntity,
  softDeleteEntityLink,
} from '@/lib/indexed-db/repositories/entity-links'
import { Link } from 'react-router-dom'

interface EntityLinksSectionProps {
  entityId: string
}

export function EntityLinksSection({ entityId }: EntityLinksSectionProps) {
  const { spaceId, session } = useAuth()
  const queryClient = useQueryClient()
  const { data: allEntities = [] } = useEntities()
  const [targetId, setTargetId] = useState('')
  const [label, setLabel] = useState('')

  const { data: links = [] } = useQuery({
    queryKey: ['entity-links', entityId],
    queryFn: () => listLinksForEntity(entityId),
    enabled: !!entityId,
  })

  const entityMap = new Map(allEntities.map((e) => [e.id, e]))

  const linkOptions = allEntities
    .filter((e) => e.id !== entityId)
    .map((e) => ({
      value: e.id,
      label: `${getEntityTypeMeta(e.entity_type).label}: ${e.title}`,
    }))

  const addLink = useMutation({
    mutationFn: async () => {
      if (!spaceId || !targetId) return
      await createEntityLink({
        id: uuidv4(),
        spaceId,
        sourceEntityId: entityId,
        targetEntityId: targetId,
        label: label.trim() || null,
        userId: session?.userId ?? null,
      })
    },
    onSuccess: () => {
      setTargetId('')
      setLabel('')
      void queryClient.invalidateQueries({ queryKey: ['entity-links', entityId] })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => softDeleteEntityLink(id, spaceId!),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['entity-links', entityId] }),
  })

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-medium text-text">Verknüpfungen</h3>
      <ul className="mb-4 flex flex-col gap-2">
        {links.map((link) => {
          const otherId =
            link.source_entity_id === entityId ? link.target_entity_id : link.source_entity_id
          const other = entityMap.get(otherId)
          if (!other) return null
          return (
            <li key={link.id} className="flex items-center justify-between gap-2 text-sm">
              <Link
                to={entityDetailPath(other.entity_type, other.id)}
                className="text-primary hover:underline"
              >
                {link.label ? `${link.label}: ` : ''}
                {other.title}
              </Link>
              <button
                type="button"
                className="text-error hover:underline"
                onClick={() => remove.mutate(link.id)}
              >
                Entfernen
              </button>
            </li>
          )
        })}
        {links.length === 0 ? (
          <p className="text-sm text-text-muted">Keine Verknüpfungen.</p>
        ) : null}
      </ul>
      <Select
        label="Eintrag verknüpfen"
        options={[{ value: '', label: 'Auswählen…' }, ...linkOptions]}
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
      />
      <Input
        className="mt-3"
        label="Bezeichnung (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Button
        className="mt-2"
        size="sm"
        onClick={() => addLink.mutate()}
        loading={addLink.isPending}
        disabled={!targetId}
      >
        Verknüpfen
      </Button>
    </section>
  )
}
