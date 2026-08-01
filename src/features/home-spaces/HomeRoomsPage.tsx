import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/features/auth/AuthProvider'
import { entityDetailPath } from '@/features/entities/entity-types'
import { useCreateEntity, useEntities } from '@/features/entities/useEntities'
import { MediaImage } from '@/features/media/MediaImage'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

const ROOM_PRESETS = [
  { value: 'wohnzimmer', label: 'Wohnzimmer' },
  { value: 'bad', label: 'Bad' },
  { value: 'kueche', label: 'Küche' },
  { value: 'schlafzimmer', label: 'Schlafzimmer' },
  { value: 'balkon', label: 'Balkon' },
  { value: 'sonstiges', label: 'Sonstiges' },
] as const

function roomKeyOf(entity: { title: string; metadata: Record<string, unknown> }) {
  const meta = String(entity.metadata?.roomKey ?? '')
  if (meta) return meta
  const title = entity.title.toLowerCase()
  const found = ROOM_PRESETS.find((r) => title.includes(r.label.toLowerCase()) || title.includes(r.value))
  return found?.value ?? 'sonstiges'
}

export function HomeRoomsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { spaceId } = useAuth()
  const { data: entities = [], isLoading } = useEntities()
  const createEntity = useCreateEntity()
  const [creating, setCreating] = useState(false)
  const [roomKey, setRoomKey] = useState<string>('wohnzimmer')
  const [customTitle, setCustomTitle] = useState('')

  const rooms = useMemo(
    () =>
      entities
        .filter((e) => e.entity_type === 'household' && !e.deleted_at)
        .sort((a, b) => a.title.localeCompare(b.title, 'de')),
    [entities],
  )

  const { data: covers = {} } = useQuery({
    queryKey: ['home-room-covers', spaceId],
    enabled: Boolean(spaceId),
    queryFn: async () => {
      const [links, assets] = await Promise.all([
        db.entityMedia.toArray(),
        db.mediaAssets.where('space_id').equals(spaceId!).toArray(),
      ])
      const display = assets.filter((m) => !m.deleted_at && m.variant === 'display')
      const map: Record<string, string> = {}
      for (const link of links.sort((a, b) => a.sort_order - b.sort_order)) {
        if (map[link.entity_id]) continue
        const asset = display.find((a) => a.id === link.media_id)
        if (asset) map[link.entity_id] = asset.storage_path
      }
      return map
    },
  })

  const handleCreate = async () => {
    if (!spaceId) return
    const preset = ROOM_PRESETS.find((r) => r.value === roomKey)
    const title =
      roomKey === 'sonstiges' && customTitle.trim()
        ? customTitle.trim()
        : (preset?.label ?? 'Raum')
    const id = uuidv4()
    await createEntity.mutateAsync({
      id,
      space_id: spaceId,
      entity_type: 'household',
      title,
      description: null,
      status: 'active',
      sort_order: rooms.length,
      metadata: { roomKey, v4Module: 'zuhause' },
    })
    setCreating(false)
    setCustomTitle('')
    await queryClient.invalidateQueries({ queryKey: ['entities'] })
    void navigate(entityDetailPath('household', id))
  }

  if (isLoading) return <LoadingState />

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-text-muted">Alltag</p>
          <h1 className="mt-1 font-serif text-3xl text-text">Zuhause</h1>
          <p className="mt-2 text-sm text-text-muted">Räume, Aufgaben, Ideen und Geräte.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreating((v) => !v)}>
          Raum
        </Button>
      </header>

      {creating ? (
        <Card padding="md" className="mb-6">
          <CardTitle className="text-xl">Neuen Raum anlegen</CardTitle>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Select
              label="Raum"
              options={ROOM_PRESETS.map((r) => ({ value: r.value, label: r.label }))}
              value={roomKey}
              onChange={(e) => setRoomKey(e.target.value)}
            />
            {roomKey === 'sonstiges' ? (
              <Input
                label="Bezeichnung"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="z. B. Abstellraum"
              />
            ) : (
              <div />
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Abbrechen
            </Button>
            <Button type="button" loading={createEntity.isPending} onClick={() => void handleCreate()}>
              Speichern
            </Button>
          </div>
        </Card>
      ) : null}

      {rooms.length === 0 ? (
        <EmptyState
          title="Noch keine Räume"
          description="Legt Wohnzimmer, Küche oder Bad an — Fotos, Notizen und Aufgaben gehören dazu."
          actionLabel="Ersten Raum anlegen"
          onAction={() => setCreating(true)}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rooms.map((room) => {
            const key = roomKeyOf(room)
            const label = ROOM_PRESETS.find((r) => r.value === key)?.label ?? room.title
            return (
              <li key={room.id}>
                <Link to={entityDetailPath('household', room.id)}>
                  <Card
                    interactive
                    padding="none"
                    className={cn('overflow-hidden transition duration-280 hover:-translate-y-0.5')}
                  >
                    {covers[room.id] && spaceId ? (
                      <MediaImage
                        storagePath={covers[room.id]}
                        spaceId={spaceId}
                        alt={room.title}
                        aspectRatio={16 / 10}
                      />
                    ) : (
                      <div className="aspect-[16/10] bg-[linear-gradient(145deg,var(--color-pastel-3),var(--color-pastel-1))]" />
                    )}
                    <div className="p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-muted">
                        {label}
                      </p>
                      <CardTitle className="mt-1 text-xl">{room.title}</CardTitle>
                      <CardDescription>
                        {room.description || 'Aufgaben, Fotos, Notizen und Geräte'}
                      </CardDescription>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
