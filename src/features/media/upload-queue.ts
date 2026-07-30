import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/indexed-db/db'
import { getOrCreateDeviceId } from '@/lib/indexed-db/device'
import type { MediaAssetRow, UploadQueueRow } from '@/lib/indexed-db/schema'
import { enqueueMutation } from '@/features/sync/outbox'
import {
  buildStoragePath,
  extensionForMime,
  processImageFile,
  type ProcessedImage,
} from '@/features/media/image-processing'
import { getSupabaseClient } from '@/lib/supabase/client'

function nowIso(): string {
  return new Date().toISOString()
}

export type MediaVariant = 'app' | 'thumb'

function queueKey(mediaId: string, variant: MediaVariant): string {
  return `${mediaId}:${variant}`
}

export async function enqueueMediaUpload(input: {
  spaceId: string
  entityId?: string
  file: File
  userId?: string | null
  caption?: string | null
}): Promise<{ mediaId: string }> {
  const processed = await processImageFile(input.file)
  const mediaId = uuidv4()
  const now = nowIso()
  const baseName = input.file.name.replace(/\.[^.]+$/, '') || 'photo'

  await storeLocalVariant(mediaId, 'app', processed.app.blob, processed.app.mimeType)
  await storeLocalVariant(mediaId, 'thumb', processed.thumb.blob, processed.thumb.mimeType)

  const parentRow: MediaAssetRow = {
    id: mediaId,
    space_id: input.spaceId,
    storage_path: buildStoragePath(
      input.spaceId,
      mediaId,
      'app',
      `${baseName}.${extensionForMime(processed.app.mimeType)}`,
    ),
    original_filename: input.file.name,
    mime_type: processed.app.mimeType,
    byte_size: processed.app.byteSize,
    width: processed.app.width,
    height: processed.app.height,
    duration_ms: null,
    blurhash: null,
    variant: 'display',
    parent_media_id: null,
    uploaded_by: input.userId ?? null,
    taken_at: null,
    metadata: { originalWidth: processed.originalWidth, originalHeight: processed.originalHeight },
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }

  const deviceId = await getOrCreateDeviceId()

  await db.transaction('rw', [db.mediaAssets, db.uploadQueue, db.outbox, db.localMediaBlobs], async () => {
    await db.mediaAssets.put(parentRow)
    await enqueueUploadRow(input.spaceId, mediaId, 'app', processed.app.mimeType)
    await enqueueUploadRow(input.spaceId, mediaId, 'thumb', processed.thumb.mimeType)
    await enqueueMutation(
      {
        mutationId: uuidv4(),
        deviceId,
        spaceId: input.spaceId,
        resourceType: 'media_asset',
        resourceId: mediaId,
        operation: 'create',
        expectedVersion: null,
        payload: {
          storage_path: parentRow.storage_path,
          original_filename: parentRow.original_filename,
          mime_type: parentRow.mime_type,
          byte_size: parentRow.byte_size,
          width: parentRow.width,
          height: parentRow.height,
          variant: 'display',
          entity_id: input.entityId,
          caption: input.caption,
        },
        createdAt: now,
      },
      { tx: db },
    )
  })

  return { mediaId }
}

async function storeLocalVariant(
  mediaId: string,
  variant: MediaVariant,
  blob: Blob,
  mimeType: string,
): Promise<void> {
  await db.localMediaBlobs.put({
    key: queueKey(mediaId, variant),
    blob,
    mimeType,
    createdAt: nowIso(),
  })
}

async function enqueueUploadRow(
  spaceId: string,
  mediaId: string,
  variant: MediaVariant,
  mimeType: string,
): Promise<void> {
  const row: UploadQueueRow = {
    id: uuidv4(),
    spaceId,
    mediaId,
    localBlobKey: queueKey(mediaId, variant),
    mimeType,
    status: 'pending',
    attemptCount: 0,
    createdAt: nowIso(),
    lastError: null,
  }
  await db.uploadQueue.put(row)
}

export async function listPendingUploads(): Promise<UploadQueueRow[]> {
  return db.uploadQueue.where('status').anyOf(['pending', 'failed']).toArray()
}

async function uploadVariant(
  row: UploadQueueRow,
  spaceId: string,
  mediaId: string,
  variant: MediaVariant,
  processed: ProcessedImage | null,
  originalFilename: string,
): Promise<void> {
  const local = await db.localMediaBlobs.get(row.localBlobKey)
  if (!local) throw new Error('Lokale Datei fehlt')

  const baseName = originalFilename.replace(/\.[^.]+$/, '') || 'photo'
  const variantData = variant === 'app' ? processed?.app : processed?.thumb
  const mimeType = local.mimeType
  const filename = `${baseName}.${extensionForMime(mimeType)}`
  const path = buildStoragePath(spaceId, mediaId, variant, filename)

  const supabase = getSupabaseClient()
  const { error } = await supabase.storage.from('media').upload(path, local.blob, {
    upsert: true,
    contentType: mimeType,
  })
  if (error) throw new Error(error.message)

  const asset: MediaAssetRow = {
    id: uuidv4(),
    space_id: spaceId,
    storage_path: path,
    original_filename: originalFilename,
    mime_type: mimeType,
    byte_size: local.blob.size,
    width: variantData?.width ?? null,
    height: variantData?.height ?? null,
    duration_ms: null,
    blurhash: null,
    variant: variant === 'app' ? 'display' : 'thumb',
    parent_media_id: mediaId,
    uploaded_by: null,
    taken_at: null,
    metadata: {},
    created_at: nowIso(),
    updated_at: nowIso(),
    deleted_at: null,
  }

  await db.mediaAssets.put(asset)
}

function parseVariantFromKey(localBlobKey: string): MediaVariant {
  return localBlobKey.endsWith(':thumb') ? 'thumb' : 'app'
}

export async function processUploadQueue(): Promise<{ uploaded: number; failed: number }> {
  if (!navigator.onLine) return { uploaded: 0, failed: 0 }

  const pending = await listPendingUploads()
  let uploaded = 0
  let failed = 0

  for (const row of pending) {
    await db.uploadQueue.update(row.id, { status: 'uploading' })
    try {
      const parent = await db.mediaAssets.get(row.mediaId)
      if (!parent) throw new Error('Media-Asset fehlt')

      const variant = parseVariantFromKey(row.localBlobKey)
      await uploadVariant(
        row,
        row.spaceId,
        row.mediaId,
        variant,
        null,
        parent.original_filename ?? 'photo.jpg',
      )

      await db.uploadQueue.update(row.id, { status: 'done', lastError: null })
      uploaded += 1
    } catch (err) {
      failed += 1
      const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen'
      await db.uploadQueue.update(row.id, {
        status: 'failed',
        attemptCount: row.attemptCount + 1,
        lastError: message,
      })
    }
  }

  await markMediaReadyWhenComplete()
  return { uploaded, failed }
}

async function markMediaReadyWhenComplete(): Promise<void> {
  const parents = await db.mediaAssets.filter((a) => a.variant === 'display' && !a.deleted_at).toArray()

  for (const parent of parents) {
    const queueRows = await db.uploadQueue.where('mediaId').equals(parent.id).toArray()
    const variants = new Set(
      queueRows.filter((q) => q.status === 'done').map((q) => parseVariantFromKey(q.localBlobKey)),
    )
    if (variants.has('app') && variants.has('thumb')) {
      await db.mediaAssets.update(parent.id, {
        metadata: { ...parent.metadata, ready: true },
        updated_at: nowIso(),
      })
    }
  }
}

export function startUploadQueueProcessor(): () => void {
  const run = () => void processUploadQueue()
  run()
  window.addEventListener('online', run)
  const interval = window.setInterval(run, 30_000)
  return () => {
    window.removeEventListener('online', run)
    window.clearInterval(interval)
  }
}
