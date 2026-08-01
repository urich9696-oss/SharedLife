import { useState } from 'react'
import { useMediaUrl } from '@/features/media/media-url'
import { cn } from '@/lib/utilities/cn'

export interface MediaImageProps {
  storagePath: string | null | undefined
  spaceId?: string
  alt: string
  className?: string
  imgClassName?: string
  aspectRatio?: number | string
  lazy?: boolean
  fallbackLabel?: string
}

/**
 * Central image renderer for private Supabase Storage paths.
 * Never shows technical paths as content.
 */
export function MediaImage({
  storagePath,
  spaceId,
  alt,
  className,
  imgClassName,
  aspectRatio = '4 / 3',
  lazy = true,
  fallbackLabel = 'Bild nicht verfügbar',
}: MediaImageProps) {
  const { url, failed, loading } = useMediaUrl(storagePath, spaceId)
  const [imgError, setImgError] = useState(false)

  const showFallback = !storagePath || failed || imgError
  const ratioStyle =
    typeof aspectRatio === 'number'
      ? { aspectRatio: String(aspectRatio) }
      : { aspectRatio }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-surface-soft',
        className,
      )}
      style={ratioStyle}
    >
      {url && !imgError ? (
        <img
          src={url}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          className={cn('absolute inset-0 size-full object-cover', imgClassName)}
          onError={() => setImgError(true)}
        />
      ) : null}

      {loading && !showFallback ? (
        <div className="absolute inset-0 animate-pulse bg-sand/30" aria-hidden />
      ) : null}

      {showFallback ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-sand/40 to-surface-soft px-3 text-center"
          role="img"
          aria-label={alt || fallbackLabel}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-text-muted"
            aria-hidden
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.5" />
            <path d="M3 16l5-4 4 3 4-5 5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs text-text-muted">{fallbackLabel}</span>
        </div>
      ) : null}
    </div>
  )
}
