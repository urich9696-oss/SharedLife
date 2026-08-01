import { describe, expect, it } from 'vitest'
import {
  humanizeMediaTitle,
  isTechnicalMediaRef,
  parseStoragePath,
} from '@/features/media/media-url'
import { buildStoragePath, sanitizeFilename } from '@/features/media/image-processing'

describe('media-url helpers', () => {
  it('parses storage paths with spaces sanitized away', () => {
    const path = buildStoragePath('space-1', 'media-1', 'app', 'Mein Foto (1).jpg')
    expect(path).toBe('space-1/media-1/app/Mein-Foto-1.jpg')
    expect(parseStoragePath(path)).toEqual({
      spaceId: 'space-1',
      mediaId: 'media-1',
      variant: 'app',
      filename: 'Mein-Foto-1.jpg',
    })
  })

  it('detects technical refs and never uses them as titles', () => {
    expect(isTechnicalMediaRef('space/media/app/photo.jpg')).toBe(true)
    expect(isTechnicalMediaRef('Unser Abend')).toBe(false)
    expect(humanizeMediaTitle('space/x/app/a.jpg', 'Abend am See.jpg')).toBe('Abend am See')
    expect(humanizeMediaTitle(null, null)).toBe('Foto')
  })

  it('sanitizes awkward filenames', () => {
    expect(sanitizeFilename('Foto mit Leerzeichen & Co!.png')).toBe('Foto-mit-Leerzeichen-Co.png')
  })
})
