import { Gallery } from '@/features/media/Gallery'
import type { WidgetProps } from '@/features/widgets/registry'
import { useEntityMedia, useMediaAssets } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function PhotoGalleryWidget({
  spaceId,
  entityId,
  config,
  title,
}: WidgetProps<'photo_gallery'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: links = [] } = useEntityMedia(resolvedEntityId)
  const mediaIds = links.slice(0, config.limit).map((l) => l.media_id)
  const { data: assets = [] } = useMediaAssets(mediaIds)

  const items = links
    .slice(0, config.limit)
    .map((link) => {
      const asset = assets.find((a) => a.id === link.media_id)
      return asset
        ? {
            id: link.id,
            src: asset.storage_path,
            caption: link.caption,
            originalFilename: asset.original_filename,
            aspectRatio: asset.width && asset.height ? asset.width / asset.height : 4 / 3,
          }
        : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <WidgetShell title={title ?? config.title ?? 'Fotos'}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Fotos.</p>
      ) : (
        <Gallery items={items} spaceId={spaceId} columns={3} />
      )}
    </WidgetShell>
  )
}
