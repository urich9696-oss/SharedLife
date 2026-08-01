import { test, expect } from '@playwright/test'

const IPHONE = { width: 390, height: 844 }

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement
    const body = document.body
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      rootScrollWidth: document.getElementById('root')?.scrollWidth ?? 0,
    }
  })
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
  expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

test.describe('SharedLife mobile UI (iPhone width)', () => {
  test.use({ viewport: IPHONE, isMobile: true, hasTouch: true })

  test('viewport meta blocks unwanted zoom', async ({ page }) => {
    await page.goto('/')
    const content = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(content).toMatch(/width=device-width/)
    expect(content).toMatch(/initial-scale=1/)
    expect(content).toMatch(/maximum-scale=1/)
    expect(content).toMatch(/user-scalable=no/)
    expect(content).toMatch(/viewport-fit=cover/)
  })

  test('login stays within viewport and inputs are ≥16px', async ({ page }) => {
    await page.goto('/login')
    await assertNoHorizontalOverflow(page)

    const email = page.getByLabel('E-Mail')
    await expect(email).toBeVisible({ timeout: 15_000 })
    await assertNoHorizontalOverflow(page)

    const inputs = page.locator(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"])',
    )
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i += 1) {
      const fontSize = await inputs.nth(i).evaluate((el) => {
        return Number.parseFloat(getComputedStyle(el).fontSize)
      })
      expect(fontSize).toBeGreaterThanOrEqual(16)
    }
  })

  test('core routes do not overflow horizontally', async ({ page }) => {
    for (const path of ['/', '/planen', '/erinnerungen', '/login']) {
      await page.goto(path)
      await page.waitForLoadState('domcontentloaded')
      await assertNoHorizontalOverflow(page)
    }
  })
})
