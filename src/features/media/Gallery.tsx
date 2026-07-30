import { useMediaUrl } from '@/features/media/media-url'
import { cn } from '@/lib/utilities/cn'

export interface GalleryItem {
  id: string
  src: string
  caption?: string | null
  aspectRatio?: number
}

export interface GalleryProps {
  items: GalleryItem[]
  spaceId: string
  columns?: number
  className?: string
}

function GalleryImage({
  item,
  spaceId,
}: {
  item: GalleryItem
  spaceId: string
}) {
  const url = useMediaUrl(item.src, spaceId)
  const ratio = item.aspectRatio ?? 4 / 3

  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-sand/20">
      <div className="relative w-full" style={{ paddingBottom: `${100 / ratio}%` }}>
        {url ? (
          <img
            src={url}
            alt={item.caption ?? ''}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-sand/40" aria-hidden />
        )}
      </div>
      {item.caption ? (
        <figcaption className="px-2 py-1 text-xs text-text-muted">{item.caption}</figcaption>
      ) : null}
    </figure>
  )
}

export function Gallery({ items, spaceId, columns = 3, className }: GalleryProps) {
  return (
    <div
      className={cn('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <GalleryImage key={item.id} item={item} spaceId={spaceId} />
      ))}
    </div>
  )
}
