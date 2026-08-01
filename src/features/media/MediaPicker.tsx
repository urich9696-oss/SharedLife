import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { MediaImage } from '@/features/media/MediaImage'
import { validateImageFile } from '@/features/media/image-processing'
import { enqueueMediaUpload } from '@/features/media/upload-queue'
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
  objectUrl: string
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
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [previews, setPreviews] = useState<PreviewItem[]>([])

  useEffect(() => {
    return () => {
      for (const item of previews) {
        if (item.objectUrl.startsWith('blob:')) URL.revokeObjectURL(item.objectUrl)
      }
    }
  }, [previews])

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
          setPreviews((prev) => [...prev, { id: tempId, objectUrl, name: file.name }])

          const { mediaId, storagePath } = await enqueueMediaUpload({
            spaceId,
            entityId,
            file,
            userId,
          })

          setPreviews((prev) =>
            prev.map((p) =>
              p.id === tempId
                ? { ...p, id: mediaId, storagePath, objectUrl: p.objectUrl }
                : p,
            ),
          )
          onUploaded?.(mediaId, storagePath)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
      } finally {
        setBusy(false)
      }
    },
    [spaceId, entityId, userId, onUploaded],
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'rounded-[18px] border-2 border-dashed p-6 text-center transition-colors duration-200',
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
        <p className="text-sm text-text-muted">Fotos hierher ziehen oder auswählen</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Aus Bibliothek
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.setAttribute('capture', 'environment')
                inputRef.current.click()
              }
            }}
          >
            Kamera
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files)
            e.target.value = ''
            inputRef.current?.removeAttribute('capture')
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
              ) : (
                <div className="relative aspect-square">
                  <img
                    src={item.objectUrl}
                    alt="Vorschau"
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {busy ? <p className="text-sm text-text-muted">Wird verarbeitet…</p> : null}
      {error ? <p className="text-sm text-error">{error}</p> : null}
    </div>
  )
}
