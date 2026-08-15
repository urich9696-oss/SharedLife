import { test, expect } from '@playwright/test'
import path from 'node:path'

const IPHONE = { width: 390, height: 844 }
const IPHONE_MAX = { width: 430, height: 932 }
const OUT = '/opt/cursor/artifacts/screenshots'

test.describe('SharedLife V8 mobile QA', () => {
  test.use({ viewport: IPHONE, isMobile: true, hasTouch: true })

  test('login and core shells on 390×844', async ({ page }, testInfo) => {
    test.skip(!process.env.E2E_DEMO, 'Requires E2E_DEMO=1 with Vite demo (non-prod)')

    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /Willkommen|SharedLife/i }).first()).toBeVisible({
      timeout: 20_000,
    })
    await page.screenshot({
      path: path.join(OUT, 'v8-login-390.png'),
      fullPage: true,
    })
    await testInfo.attach('login-390', {
      path: path.join(OUT, 'v8-login-390.png'),
      contentType: 'image/png',
    })

    // Demo-Login falls vorhanden
    const demoBtn = page.getByRole('button', { name: /Demo|ohne Konto|lokal/i })
    if (await demoBtn.count()) {
      await demoBtn.first().click()
      await page.waitForURL(/\/$|\/planen|\/home/i, { timeout: 15_000 }).catch(() => undefined)
    }

    for (const [route, name] of [
      ['/', 'home'],
      ['/planen', 'planen'],
      ['/erinnerungen?tab=weg', 'momente'],
      ['/module/geschenke', 'wuensche'],
      ['/module/rezepte', 'rezepte'],
      ['/einkauf', 'einkauf'],
    ] as const) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      const file = path.join(OUT, `v8-${name}-390.png`)
      await page.screenshot({ path: file, fullPage: true })
      await testInfo.attach(name, { path: file, contentType: 'image/png' })
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        return Math.max(doc.scrollWidth, document.body.scrollWidth) - doc.clientWidth
      })
      expect(overflow).toBeLessThanOrEqual(1)
    }
  })

  test('430×932 planen week chrome', async ({ page }, testInfo) => {
    test.skip(!process.env.E2E_DEMO, 'Requires E2E_DEMO=1')
    await page.setViewportSize(IPHONE_MAX)
    await page.goto('/planen')
    await page.waitForLoadState('domcontentloaded')
    const file = path.join(OUT, 'v8-planen-430.png')
    await page.screenshot({ path: file, fullPage: true })
    await testInfo.attach('planen-430', { path: file, contentType: 'image/png' })
  })
})
