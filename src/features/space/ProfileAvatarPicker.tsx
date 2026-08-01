import { useRef, useState } from 'react'
import { Camera, ImageIcon, Trash2, UserRound } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useAuth } from '@/features/auth/AuthProvider'
import { MediaImage } from '@/features/media/MediaImage'
import { validateImageFile } from '@/features/media/image-processing'
import { enqueueMediaUpload } from '@/features/media/upload-queue'
import { cn } from '@/lib/utilities/cn'

export function ProfileAvatarPicker({
  label,
  name,
  storagePath,
  onChange,
  disabled,
  className,
}: {
  label: string
  name: string
  storagePath: string | null
  onChange: (path: string | null) => Promise<void> | void
  disabled?: boolean
  className?: string
}) {
  const { spaceId, session } = useAuth()
  const libraryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const initial = (name.trim() || '?').charAt(0).toUpperCase()

  const upload = async (file: File) => {
    if (!spaceId) {
      setError('Kein Space verfügbar.')
      return
    }
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
      const { storagePath: path } = await enqueueMediaUpload({
        spaceId,
        file,
        userId: session?.userId,
      })
      await onChange(path)
      setProgress(null)
      setSheetOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
      setProgress(null)
      setLocalPreview(null)
    } finally {
      setBusy(false)
      URL.revokeObjectURL(preview)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError(null)
    try {
      await onChange(null)
      setLocalPreview(null)
      setSheetOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      <p className="text-sm font-medium text-text">{label}</p>
      <button
        type="button"
        disabled={disabled || busy || !spaceId}
        onClick={() => setSheetOpen(true)}
        className={cn(
          'relative size-24 overflow-hidden rounded-full border border-border bg-surface-soft',
          'shadow-xs transition duration-[var(--duration-fast)] active:scale-[0.98]',
          'outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus',
          'disabled:opacity-60',
        )}
        aria-label={`${label} ändern`}
      >
        {localPreview ? (
          <img src={localPreview} alt="" className="size-full object-cover" />
        ) : storagePath && spaceId ? (
          <MediaImage
            storagePath={storagePath}
            spaceId={spaceId}
            alt={name}
            aspectRatio={1}
            className="size-full rounded-full"
            lazy={false}
            fallbackLabel={initial}
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-text-muted">
            <UserRound size={28} strokeWidth={1.5} />
            <span className="text-xs font-medium">{initial}</span>
          </div>
        )}
        {busy && progress ? (
          <div className="absolute inset-x-0 bottom-0 bg-text/50 px-1 py-1 text-center text-[10px] font-medium leading-tight text-surface">
            {progress}
          </div>
        ) : null}
      </button>
      <p className="text-xs text-text-muted">Tippen zum Ändern</p>

      <BottomSheet open={sheetOpen} onClose={() => !busy && setSheetOpen(false)} title={label}>
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
          {storagePath || localPreview ? (
            <button
              type="button"
              disabled={busy}
              className="flex min-h-14 items-center gap-4 rounded-lg px-2 text-[17px] text-error hover:bg-error-subtle"
              onClick={() => void remove()}
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
          capture="user"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </BottomSheet>
    </div>
  )
}
