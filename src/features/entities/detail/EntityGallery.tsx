import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, Star, Trash2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MediaImage } from '@/features/media/MediaImage'
import { validateImageFile } from '@/features/media/image-processing'
import { enqueueMediaUpload } from '@/features/media/upload-queue'
import {
  setEntityCoverMedia,
  unlinkEntityMediaById,
} from '@/features/media/entity-media-actions'
import { db } from '@/lib/indexed-db/db'
import { cn } from '@/lib/utilities/cn'

interface GalleryItem {
  mediaId: string
  storagePath: string
  role: string
  sortOrder: number
}

async function loadGallery(entityId: string, spaceId: string): Promise<GalleryItem[]> {
  const [links, assets] = await Promise.all([
    db.entityMedia.where('entity_id').equals(entityId).toArray(),
    db.mediaAssets.where('space_id').equals(spaceId).toArray(),
  ])
  const items: GalleryItem[] = []
  for (const link of links.sort((a, b) => a.sort_order - b.sort_order)) {
    const asset = assets.find(
      (a) => a.id === link.media_id && !a.deleted_at && a.variant === 'display',
    )
    if (!asset) continue
    items.push({
      mediaId: asset.id,
      storagePath: asset.storage_path,
      role: link.role,
      sortOrder: link.sort_order,
    })
  }
  return items
}

/** Weitere Bilder eines Moments / Eintrags — horizontal, ruhig */
export function EntityGallery({
  spaceId,
  entityId,
  userId,
  allowMultiple = true,
}: {
  spaceId: string
  entityId: string
  userId?: string | null
  allowMultiple?: boolean
}) {
  const queryClient = useQueryClient()
  const libraryRef = useRef<HTMLInputElement>(null)
  const [menuFor, setMenuFor] = useState<GalleryItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: items = [] } = useQuery({
    queryKey: ['entity-gallery', entityId, spaceId],
    queryFn: () => loadGallery(entityId, spaceId),
    enabled: Boolean(spaceId && entityId),
  })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['entity-gallery', entityId] }),
      queryClient.invalidateQueries({ queryKey: ['entity-cover', entityId] }),
      queryClient.invalidateQueries({ queryKey: ['entityMedia', entityId] }),
      queryClient.invalidateQueries({ queryKey: ['home-recent-moments', spaceId] }),
      queryClient.invalidateQueries({ queryKey: ['deck-cards', spaceId] }),
    ])
  }

  const uploadFiles = async (files: FileList | File[]) => {
    setBusy(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const check = validateImageFile(file)
        if (!check.ok) {
          setError(check.error ?? 'Ungültige Datei')
          continue
        }
        await enqueueMediaUpload({
          spaceId,
          entityId,
          file,
          userId,
          role: items.length === 0 ? 'cover' : 'gallery',
        })
      }
      await invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <div
            key={item.mediaId}
            className="relative min-w-[7.5rem] snap-start overflow-hidden rounded-lg border border-border/60 bg-surface shadow-xs"
          >
            <MediaImage
              storagePath={item.storagePath}
              spaceId={spaceId}
              alt=""
              aspectRatio={1}
            />
            <button
              type="button"
              className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-text/40 text-surface backdrop-blur-sm"
              aria-label="Bildoptionen"
              onClick={() => setMenuFor(item)}
            >
              <MoreHorizontal size={16} strokeWidth={1.75} />
            </button>
            {item.role === 'cover' || item.sortOrder === 0 ? (
              <span className="absolute bottom-1 left-1 rounded-full bg-text/40 px-2 py-0.5 text-[10px] font-medium text-surface backdrop-blur-sm">
                Hero
              </span>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          disabled={busy}
          onClick={() => libraryRef.current?.click()}
          className={cn(
            'flex min-h-[7.5rem] min-w-[7.5rem] snap-start flex-col items-center justify-center gap-2',
            'rounded-lg border border-dashed border-border/80 bg-bg text-primary',
            'transition active:scale-[0.98]',
          )}
        >
          <Plus size={22} strokeWidth={1.75} />
          <span className="px-2 text-center text-xs font-medium">
            {busy ? 'Lädt…' : 'Bilder hinzufügen'}
          </span>
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}

      <input
        ref={libraryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={allowMultiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <BottomSheet
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        title="Bild"
      >
        <div className="flex flex-col gap-2 pb-4">
          <button
            type="button"
            className="flex min-h-14 items-center gap-4 rounded-lg px-2 text-[17px] text-text hover:bg-bg"
            onClick={() => {
              if (!menuFor) return
              void setEntityCoverMedia({
                spaceId,
                entityId,
                mediaId: menuFor.mediaId,
                userId,
              }).then(async () => {
                setMenuFor(null)
                await invalidate()
              })
            }}
          >
            <Star size={20} strokeWidth={1.75} />
            Als Hero-Bild festlegen
          </button>
          <button
            type="button"
            className="flex min-h-14 items-center gap-4 rounded-lg px-2 text-[17px] text-error hover:bg-error-subtle"
            onClick={() => {
              if (!menuFor) return
              void unlinkEntityMediaById({
                spaceId,
                entityId,
                mediaId: menuFor.mediaId,
                userId,
              }).then(async () => {
                setMenuFor(null)
                await invalidate()
              })
            }}
          >
            <Trash2 size={20} strokeWidth={1.75} />
            Bild entfernen
          </button>
        </div>
      </BottomSheet>
    </section>
  )
}
