import { Collage } from '@/features/media/Collage'
import type { WidgetProps } from '@/features/widgets/registry'
import { useEntityMedia, useMediaAssets } from '@/features/widgets/use-widget-data'
import { WidgetShell } from '@/features/widgets/components/WidgetShell'

export function PhotoCollageWidget({
  spaceId,
  entityId,
  config,
  title,
}: WidgetProps<'photo_collage'>) {
  const resolvedEntityId = config.entityId ?? entityId ?? null
  const { data: links = [] } = useEntityMedia(resolvedEntityId)
  const mediaIds = links.map((l) => l.media_id)
  const { data: assets = [] } = useMediaAssets(mediaIds)

  const items = links
    .map((link) => {
      const asset = assets.find((a) => a.id === link.media_id)
      return asset
        ? {
            id: link.id,
            src: asset.storage_path,
            caption: link.caption,
            originalFilename: asset.original_filename,
          }
        : null
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return (
    <WidgetShell title={title ?? config.title ?? 'Collage'}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Keine Bilder für die Collage.</p>
      ) : (
        <Collage items={items} spaceId={spaceId} columns={config.columns} />
      )}
    </WidgetShell>
  )
}
