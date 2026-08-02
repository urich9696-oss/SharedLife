import { describe, expect, it } from 'vitest'
import { APP_RELEASE_NAME, APP_VERSION, formatAppVersionLabel } from '@/lib/app-version'

describe('app version (V6)', () => {
  it('exponiert SharedLife V6', () => {
    expect(APP_RELEASE_NAME).toBe('SharedLife V6')
    expect(APP_VERSION).toMatch(/^6\./)
    expect(formatAppVersionLabel()).toContain('SharedLife V6')
    expect(formatAppVersionLabel()).toContain(APP_VERSION)
  })
})
