import { describe, expect, it } from 'vitest'
import { APP_RELEASE_NAME, APP_VERSION, formatAppVersionLabel } from '@/lib/app-version'

describe('app version (V8)', () => {
  it('exponiert SharedLife V8', () => {
    expect(APP_RELEASE_NAME).toBe('SharedLife V8')
    expect(APP_VERSION).toMatch(/^8\./)
    expect(formatAppVersionLabel()).toContain('SharedLife V8')
    expect(formatAppVersionLabel()).toContain(APP_VERSION)
  })
})
