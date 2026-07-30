import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  attachLocationToEntity,
  createLocation,
  listLocationsForEntity,
} from '@/lib/indexed-db/repositories/locations'

interface LocationAttachProps {
  entityId: string
}

export function LocationAttach({ entityId }: LocationAttachProps) {
  const { spaceId, session } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')

  const { data: locations = [] } = useQuery({
    queryKey: ['entity-locations', entityId],
    queryFn: () => listLocationsForEntity(entityId),
    enabled: !!entityId,
  })

  const attach = useMutation({
    mutationFn: async () => {
      if (!spaceId || !name.trim()) return
      const location = await createLocation({
        id: uuidv4(),
        spaceId,
        name: name.trim(),
        city: city.trim() || null,
        userId: session?.userId ?? null,
      })
      await attachLocationToEntity({
        id: uuidv4(),
        spaceId,
        entityId,
        locationId: location.id,
      })
    },
    onSuccess: () => {
      setName('')
      setCity('')
      void queryClient.invalidateQueries({ queryKey: ['entity-locations', entityId] })
    },
  })

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 font-medium text-text">Orte</h3>
      <ul className="mb-4 flex flex-col gap-2">
        {locations.map(({ location }) => (
          <li key={location.id} className="text-sm text-text">
            {location.name}
            {location.city ? <span className="text-text-muted"> · {location.city}</span> : null}
          </li>
        ))}
        {locations.length === 0 ? (
          <p className="text-sm text-text-muted">Kein Ort verknüpft.</p>
        ) : null}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Ort" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Stadt" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <Button
        className="mt-2"
        size="sm"
        onClick={() => attach.mutate()}
        loading={attach.isPending}
        disabled={!name.trim()}
      >
        Ort hinzufügen
      </Button>
    </section>
  )
}
