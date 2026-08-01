import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, ImageIcon, Trash2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MediaImage } from '@/features/media/MediaImage'
import { validateImageFile } from '@/features/media/image-processing'
import { enqueueMediaUpload } from '@/features/media/upload-queue'
import { setEntityCoverMedia, unlinkEntityMedia } from '@/features/media/entity-media-actions'
import { cn } from '@/lib/utilities/cn'

interface HeroMediaProps {
  spaceId: string
  entityId: string
  userId?: string | null
  storagePath: string | null
  title: string
  aspectClassName?: string
  className?: string
}

/** Tap-to-change Hero — kein gestrichelter Upload-Kasten */
export function HeroMedia({
  spaceId,
  entityId,
  userId,
  storagePath,
  title,
  aspectClassName = 'aspect-[16/10] max-h-80',
  className,
}: HeroMediaProps) {
  const queryClient = useQueryClient()
  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['entity-cover', entityId] }),
      queryClient.invalidateQueries({ queryKey: ['entity-gallery', entityId] }),
      queryClient.invalidateQueries({ queryKey: ['entityMedia', entityId] }),
      queryClient.invalidateQueries({ queryKey: ['mediaAssets'] }),
      queryClient.invalidateQueries({ queryKey: ['entity', entityId] }),
    ])
  }

  const upload = async (file: File) => {
    const check = validateImageFile(file)
    if (!check.ok) {
      setError(check.error ?? 'Ungültige Datei')
      return
    }
    setError(null)
    setBusy(true)
    setProgress('Bild wird vorbereitet…')
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    try {
      setProgress('Wird hochgeladen…')
      const { mediaId } = await enqueueMediaUpload({
        spaceId,
        entityId,
        file,
        userId,
        role: 'cover',
      })
      await setEntityCoverMedia({ spaceId, entityId, mediaId, userId })
      setProgress(null)
      setSheetOpen(false)
      await invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
      setProgress(null)
    } finally {
      setBusy(false)
      URL.revokeObjectURL(preview)
    }
  }

  const removeCover = async () => {
    if (!storagePath) return
    setBusy(true)
    setError(null)
    try {
      await unlinkEntityMedia({ spaceId, entityId, storagePath, userId })
      setLocalPreview(null)
      setSheetOpen(false)
      await invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  const displayPath = localPreview ? null : storagePath

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={cn(
          'relative w-full overflow-hidden rounded-lg border border-border/60 bg-surface text-left shadow-md',
          'transition duration-[var(--duration-fast)] active:scale-[0.99]',
          className,
        )}
        aria-label={storagePath ? 'Hero-Bild ändern' : 'Bild hinzufügen'}
      >
        <div className={cn('relative w-full overflow-hidden', aspectClassName)}>
          <div className="absolute inset-0 bg-[linear-gradient(145deg,var(--color-pastel-1),var(--color-pastel-2))]" />
          {localPreview ? (
            <img
              src={localPreview}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          ) : displayPath ? (
            <MediaImage
              storagePath={displayPath}
              spaceId={spaceId}
              alt={title}
              className="absolute inset-0 rounded-none"
              aspectRatio={16 / 10}
              lazy={false}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-muted">
              <ImageIcon size={28} strokeWidth={1.5} />
              <span className="text-sm font-medium">Bild hinzufügen</span>
            </div>
          )}
          {busy && progress ? (
            <div className="absolute inset-x-0 bottom-0 bg-text/45 px-4 py-2 text-center text-xs font-medium text-surface">
              {progress}
            </div>
          ) : null}
        </div>
      </button>

      <BottomSheet open={sheetOpen} onClose={() => !busy && setSheetOpen(false)} title="Hero-Bild">
        <div className="flex flex-col gap-2 pb-4">
          <button
            type="button"
            disabled={busy}
            className="flex min-h-14 items-center gap-4 rounded-lg px-2 text-[17px] text-text hover:bg-bg"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera size={20} strokeWidth={1.75} />
            Foto aufnehmen
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex min-h-14 items-center gap-4 rounded-lg px-2 text-[17px] text-text hover:bg-bg"
            onClick={() => libraryRef.current?.click()}
          >
            <ImageIcon size={20} strokeWidth={1.75} />
            Aus Mediathek wählen
          </button>
          {storagePath ? (
            <button
              type="button"
              disabled={busy}
              className="flex min-h-14 items-center gap-4 rounded-lg px-2 text-[17px] text-error hover:bg-error-subtle"
              onClick={() => void removeCover()}
            >
              <Trash2 size={20} strokeWidth={1.75} />
              Bild entfernen
            </button>
          ) : null}
          {error ? <p className="px-2 text-sm text-error">{error}</p> : null}
        </div>
        <input
          ref={libraryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </BottomSheet>
    </>
  )
}
