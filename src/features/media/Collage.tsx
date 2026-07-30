import { useMediaUrl } from '@/features/media/media-url'
import { cn } from '@/lib/utilities/cn'

export interface CollageItem {
  id: string
  src: string
  caption?: string | null
}

export interface CollageProps {
  items: CollageItem[]
  spaceId: string
  columns?: number
  className?: string
}

function CollageTile({ item, spaceId }: { item: CollageItem; spaceId: string }) {
  const url = useMediaUrl(item.src, spaceId)

  return (
    <div className="relative aspect-square overflow-hidden rounded-md bg-sand/30">
      {url ? (
        <img
          src={url}
          alt={item.caption ?? ''}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <div className="size-full animate-pulse bg-sand/40" aria-hidden />
      )}
    </div>
  )
}

export function Collage({ items, spaceId, columns = 3, className }: CollageProps) {
  const visible = items.slice(0, columns * 2)

  return (
    <div
      className={cn('grid gap-1', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {visible.map((item) => (
        <CollageTile key={item.id} item={item} spaceId={spaceId} />
      ))}
    </div>
  )
}
