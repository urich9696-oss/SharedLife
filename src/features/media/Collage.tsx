import { MediaImage } from '@/features/media/MediaImage'
import { humanizeMediaTitle } from '@/features/media/media-url'
import { cn } from '@/lib/utilities/cn'

export interface CollageItem {
  id: string
  src: string
  caption?: string | null
  originalFilename?: string | null
}

export interface CollageProps {
  items: CollageItem[]
  spaceId: string
  columns?: number
  className?: string
}

export function Collage({ items, spaceId, columns = 3, className }: CollageProps) {
  const visible = items.slice(0, columns * 2)

  return (
    <div
      className={cn('grid gap-1', className)}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {visible.map((item) => (
        <MediaImage
          key={item.id}
          storagePath={item.src}
          spaceId={spaceId}
          alt={humanizeMediaTitle(item.caption, item.originalFilename)}
          className="rounded-md"
          aspectRatio={1}
        />
      ))}
    </div>
  )
}
