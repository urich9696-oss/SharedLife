import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { MediaImage } from '@/features/media/MediaImage'
import { validateImageFile } from '@/features/media/image-processing'
import { enqueueMediaUpload } from '@/features/media/upload-queue'
import {
  useEntityMedia,
  useMediaAssets,
} from '@/features/widgets/use-widget-data'
import { cn } from '@/lib/utilities/cn'

export interface MediaPickerProps {
  spaceId: string
  entityId?: string
  userId?: string | null
  onUploaded?: (mediaId: string, storagePath: string) => void
  className?: string
}

interface PreviewItem {
  id: string
  objectUrl?: string
  storagePath?: string
  name: string
}

export function MediaPicker({
  spaceId,
  entityId,
  userId,
  onUploaded,
  className,
}: MediaPickerProps) {
  const queryClient = useQueryClient()
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sessionPreviews, setSessionPreviews] = useState<PreviewItem[]>([])

  const { data: links = [] } = useEntityMedia(entityId)
  const mediaIds = useMemo(() => links.map((l) => l.media_id), [links])
  const { data: assets = [] } = useMediaAssets(mediaIds)

  const existingPreviews = useMemo(() => {
    const items: PreviewItem[] = []
    for (const link of links) {
      const asset = assets.find((a) => a.id === link.media_id && a.variant === 'display')
      if (!asset) continue
      items.push({
        id: asset.id,
        storagePath: asset.storage_path,
        name: asset.original_filename || 'Foto',
      })
    }
    return items
  }, [links, assets])

  const previews = useMemo(() => {
    const byId = new Map<string, PreviewItem>()
    for (const item of existingPreviews) byId.set(item.id, item)
    for (const item of sessionPreviews) {
      // Prefer session blob while upload settles, then storage path.
      byId.set(item.id, { ...byId.get(item.id), ...item })
    }
    return Array.from(byId.values())
  }, [existingPreviews, sessionPreviews])

  useEffect(() => {
    return () => {
      for (const item of sessionPreviews) {
        if (item.objectUrl?.startsWith('blob:')) URL.revokeObjectURL(item.objectUrl)
      }
    }
  }, [sessionPreviews])

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const list = Array.from(files)
      if (list.length === 0) return

      setBusy(true)
      try {
        for (const file of list) {
          const check = validateImageFile(file)
          if (!check.ok) {
            setError(check.error ?? 'Ungültige Datei')
            continue
          }

          const objectUrl = URL.createObjectURL(file)
          const tempId = `preview-${crypto.randomUUID()}`
          setSessionPreviews((prev) => [...prev, { id: tempId, objectUrl, name: file.name }])

          const { mediaId, storagePath } = await enqueueMediaUpload({
            spaceId,
            entityId,
            file,
            userId,
          })

          setSessionPreviews((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? { ...p, id: mediaId, storagePath, objectUrl: p.objectUrl }
                : p,
            ),
          )
          onUploaded?.(mediaId, storagePath)
        }

        if (entityId) {
          void queryClient.invalidateQueries({ queryKey: ['entityMedia', entityId] })
          void queryClient.invalidateQueries({ queryKey: ['mediaAssets'] })
          void queryClient.invalidateQueries({ queryKey: ['home-memories', spaceId] })
          void queryClient.invalidateQueries({ queryKey: ['home-timeline', spaceId] })
          void queryClient.invalidateQueries({ queryKey: ['timeline-derived', spaceId] })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
      } finally {
        setBusy(false)
      }
    },
    [spaceId, entityId, userId, onUploaded, queryClient],
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'rounded-[18px] border-2 border-dashed p-5 text-center transition-colors duration-200 sm:p-6',
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-bg',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          void handleFiles(e.dataTransfer.files)
        }}
      >
        <p className="text-sm text-text-muted">
          Fotos hinzufügen — auch bei geplanten Einträgen
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => libraryInputRef.current?.click()}
          >
            Aus Bibliothek
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => cameraInputRef.current?.click()}
          >
            Kamera
          </Button>
        </div>
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {previews.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-border">
              {item.storagePath ? (
                <MediaImage
                  storagePath={item.storagePath}
                  spaceId={spaceId}
                  alt="Hochgeladenes Foto"
                  aspectRatio={1}
                  lazy={false}
                />
              ) : item.objectUrl ? (
                <div className="relative aspect-square">
                  <img
                    src={item.objectUrl}
                    alt="Vorschau"
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">Noch keine Fotos zu diesem Eintrag.</p>
      )}

      {busy ? <p className="text-sm text-text-muted">Wird verarbeitet…</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  )
}
