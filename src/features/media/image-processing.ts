export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

export const MAX_SOURCE_BYTES = 25 * 1024 * 1024
export const MAX_SOURCE_DIMENSION = 8192
export const APP_MAX_DIMENSION = 2560
export const THUMB_MAX_DIMENSION = 400
export const MAX_APP_BYTES = 4 * 1024 * 1024
export const MAX_THUMB_BYTES = 200 * 1024

export interface ImageValidationResult {
  ok: boolean
  error?: string
  mimeType?: AllowedImageMime
  width?: number
  height?: number
  byteSize?: number
}

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!isAllowedImageMime(file.type)) {
    return { ok: false, error: 'Dateityp nicht unterstützt. Erlaubt: JPEG, PNG, WebP, GIF.' }
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return { ok: false, error: `Datei zu gross (max. ${MAX_SOURCE_BYTES / 1024 / 1024} MB).` }
  }
  return { ok: true, mimeType: file.type, byteSize: file.size }
}

export function validateImageDimensions(width: number, height: number): ImageValidationResult {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return { ok: false, error: 'Ungültige Bildabmessungen.' }
  }
  if (width > MAX_SOURCE_DIMENSION || height > MAX_SOURCE_DIMENSION) {
    return {
      ok: false,
      error: `Bild zu gross (max. ${MAX_SOURCE_DIMENSION}px pro Seite).`,
      width,
      height,
    }
  }
  return { ok: true, width, height }
}

export interface ProcessedVariant {
  blob: Blob
  mimeType: 'image/jpeg' | 'image/webp'
  width: number
  height: number
  byteSize: number
}

export interface ProcessedImage {
  app: ProcessedVariant
  thumb: ProcessedVariant
  originalWidth: number
  originalHeight: number
}

function computeTargetSize(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxDim) return { width, height }
  const scale = maxDim / longest
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

async function bitmapFromFile(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  throw new Error('createImageBitmap wird nicht unterstützt')
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/jpeg' | 'image/webp',
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Kompression fehlgeschlagen'))),
      mimeType,
      quality,
    )
  })
}

async function renderVariant(
  source: ImageBitmap,
  maxDim: number,
  maxBytes: number,
): Promise<ProcessedVariant> {
  const target = computeTargetSize(source.width, source.height, maxDim)
  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')
  ctx.drawImage(source, 0, 0, target.width, target.height)

  const preferWebp = typeof canvas.toDataURL('image/webp') === 'string'
  const mimeType: 'image/jpeg' | 'image/webp' = preferWebp ? 'image/webp' : 'image/jpeg'

  let quality = 0.88
  let blob = await canvasToBlob(canvas, mimeType, quality)

  while (blob.size > maxBytes && quality > 0.4) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, mimeType, quality)
  }

  return {
    blob,
    mimeType,
    width: target.width,
    height: target.height,
    byteSize: blob.size,
  }
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  const fileCheck = validateImageFile(file)
  if (!fileCheck.ok) throw new Error(fileCheck.error)

  const bitmap = await bitmapFromFile(file)
  const dimCheck = validateImageDimensions(bitmap.width, bitmap.height)
  if (!dimCheck.ok) {
    bitmap.close()
    throw new Error(dimCheck.error)
  }

  try {
    const [app, thumb] = await Promise.all([
      renderVariant(bitmap, APP_MAX_DIMENSION, MAX_APP_BYTES),
      renderVariant(bitmap, THUMB_MAX_DIMENSION, MAX_THUMB_BYTES),
    ])

    return {
      app,
      thumb,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
    }
  } finally {
    bitmap.close()
  }
}

export function buildStoragePath(
  spaceId: string,
  mediaId: string,
  variant: 'app' | 'thumb',
  filename: string,
): string {
  return `${spaceId}/${mediaId}/${variant}/${filename}`
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/webp':
      return 'webp'
    case 'image/png':
      return 'png'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}
