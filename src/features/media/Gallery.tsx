import { MediaImage } from '@/features/media/MediaImage'
import { humanizeMediaTitle } from '@/features/media/media-url'
import { cn } from '@/lib/utilities/cn'

export interface GalleryItem {
  id: string
  src: string
  caption?: string | null
  originalFilename?: string | null
  aspectRatio?: number
}

export interface GalleryProps {
  items: GalleryItem[]
  spaceId: string
  columns?: number
  className?: string
  horizontal?: boolean
}

export function Gallery({
  items,
  spaceId,
  columns = 3,
  className,
  horizontal = false,
}: GalleryProps) {
  if (horizontal) {
    return (
      <div
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {items.map((item) => {
          const title = humanizeMediaTitle(item.caption, item.originalFilename)
          return (
            <figure
              key={item.id}
              className="w-[72%] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-border bg-surface shadow-xs sm:w-[46%]"
            >
              <MediaImage
                storagePath={item.src}
                spaceId={spaceId}
                alt={title}
                aspectRatio={item.aspectRatio ?? 4 / 3}
              />
              {item.caption && item.caption !== title ? null : null}
              <figcaption className="px-3 py-2 text-xs text-text-muted">{title}</figcaption>
            </figure>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const title = humanizeMediaTitle(item.caption, item.originalFilename)
        return (
          <figure
            key={item.id}
            className="overflow-hidden rounded-[18px] border border-border bg-surface shadow-xs"
          >
            <MediaImage
              storagePath={item.src}
              spaceId={spaceId}
              alt={title}
              aspectRatio={item.aspectRatio ?? 4 / 3}
            />
            {item.caption && !item.caption.includes('/') ? (
              <figcaption className="px-2 py-1 text-xs text-text-muted">{title}</figcaption>
            ) : null}
          </figure>
        )
      })}
    </div>
  )
}
