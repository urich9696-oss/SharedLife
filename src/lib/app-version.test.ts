import { describe, expect, it } from 'vitest'
import { APP_RELEASE_NAME, APP_VERSION, formatAppVersionLabel } from '@/lib/app-version'

describe('app version (V7)', () => {
  it('exponiert SharedLife V7', () => {
    expect(APP_RELEASE_NAME).toBe('SharedLife V7')
    expect(APP_VERSION).toMatch(/^7\./)
    expect(formatAppVersionLabel()).toContain('SharedLife V7')
    expect(formatAppVersionLabel()).toContain(APP_VERSION)
  })
})
