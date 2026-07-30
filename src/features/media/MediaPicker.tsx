import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { validateImageFile } from '@/features/media/image-processing'
import { enqueueMediaUpload } from '@/features/media/upload-queue'
import { cn } from '@/lib/utilities/cn'

export interface MediaPickerProps {
  spaceId: string
  entityId?: string
  userId?: string | null
  onUploaded?: (mediaId: string) => void
  className?: string
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
          const { mediaId } = await enqueueMediaUpload({
            spaceId,
            entityId,
            file,
            userId,
          })
          onUploaded?.(mediaId)
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
          'rounded-xl border-2 border-dashed p-6 text-center transition-colors',
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
      {busy ? <p className="text-sm text-text-muted">Wird verarbeitet…</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}
