import { describe, expect, it } from 'vitest'
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_DIMENSION,
  buildStoragePath,
  isAllowedImageMime,
  validateImageDimensions,
  validateImageFile,
} from '@/features/media/image-processing'

describe('image-processing validation', () => {
  it('accepts allowed mime types', () => {
    for (const mime of ALLOWED_IMAGE_MIME_TYPES) {
      expect(isAllowedImageMime(mime)).toBe(true)
    }
    expect(isAllowedImageMime('image/bmp')).toBe(false)
  })

  it('rejects unsupported file types', () => {
    const file = new File(['x'], 'test.bmp', { type: 'image/bmp' })
    const result = validateImageFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/nicht unterstützt/)
  })

  it('rejects oversized files', () => {
    const big = new Uint8Array(MAX_SOURCE_BYTES + 1)
    const file = new File([big], 'big.jpg', { type: 'image/jpeg' })
    const result = validateImageFile(file)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/zu gross/)
  })

  it('validates dimensions', () => {
    expect(validateImageDimensions(100, 200).ok).toBe(true)
    expect(validateImageDimensions(0, 200).ok).toBe(false)
    expect(validateImageDimensions(MAX_SOURCE_DIMENSION + 1, 100).ok).toBe(false)
  })

  it('builds idempotent storage paths', () => {
    const path = buildStoragePath('space-1', 'media-1', 'thumb', 'photo.webp')
    expect(path).toBe('space-1/media-1/thumb/photo.webp')
  })
})
