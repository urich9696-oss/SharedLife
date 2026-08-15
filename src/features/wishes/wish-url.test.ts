import { describe, expect, it } from 'vitest'
import {
  openWishLinkLabel,
  parseSafeExternalUrl,
} from '@/features/wishes/wish-url'
import { normalizeWishPriority, wishPriorityLabel } from '@/features/wishes/wish-priority'

describe('wish-url V8', () => {
  it('normalisiert fehlendes Protokoll zu https', () => {
    const parsed = parseSafeExternalUrl('shop.example/wish')
    expect(parsed?.href).toBe('https://shop.example/wish')
    expect(parsed?.domain).toBe('shop.example')
  })

  it('erlaubt nur http/https', () => {
    expect(parseSafeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(parseSafeExternalUrl('ftp://files.example')).toBeNull()
    expect(parseSafeExternalUrl('https://safe.example/a')).not.toBeNull()
  })

  it('liefert Link-Label mit Domain', () => {
    const parsed = parseSafeExternalUrl('https://www.zalando.ch/item')
    expect(openWishLinkLabel(parsed)).toBe('Bei zalando.ch öffnen')
  })

  it('ohne Link keine Aktion', () => {
    expect(parseSafeExternalUrl('')).toBeNull()
    expect(openWishLinkLabel(null)).toBeNull()
  })
})

describe('wish-priority', () => {
  it('mapped medium → normal und dream → Herzenswunsch', () => {
    expect(normalizeWishPriority('medium')).toBe('normal')
    expect(wishPriorityLabel('dream')).toBe('Herzenswunsch')
  })
})
