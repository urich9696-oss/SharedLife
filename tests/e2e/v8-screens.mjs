import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/screenshots'
fs.mkdirSync(OUT, { recursive: true })

async function shoot(viewport, suffix) {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport,
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(OUT, `v8-login-${suffix}.png`), fullPage: true })

  // Demo OTP flow: any 6 digits work in demo mode
  const email = page.getByLabel(/E-Mail/i).or(page.locator('input[type="email"]')).first()
  if (await email.count()) {
    await email.fill('dennis@sharedlife.local')
  }
  const send = page.getByRole('button', { name: /Code senden|Senden|Weiter/i }).first()
  if (await send.count()) {
    await send.click()
    await page.waitForTimeout(800)
  }
  // OTP inputs
  const otpInputs = page.locator('input[inputmode="numeric"], input[autocomplete="one-time-code"]')
  if (await otpInputs.count()) {
    const first = otpInputs.first()
    await first.click()
    await page.keyboard.type('123456')
    await page.waitForTimeout(1500)
  } else {
    const otpField = page.getByLabel(/Code|OTP/i).first()
    if (await otpField.count()) {
      await otpField.fill('123456')
      const verify = page.getByRole('button', { name: /Bestätigen|Anmelden|Prüfen/i }).first()
      if (await verify.count()) await verify.click()
      await page.waitForTimeout(1500)
    }
  }

  const routes = [
    ['/', 'home'],
    ['/planen', 'planen'],
    ['/erinnerungen?tab=weg', 'momente'],
    ['/module/geschenke', 'wuensche'],
    ['/module/rezepte', 'rezepte'],
    ['/einkauf', 'einkauf'],
    ['/settings', 'settings'],
  ]
  for (const [route, name] of routes) {
    await page.goto(`http://127.0.0.1:5173${route}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(700)
    await page.screenshot({ path: path.join(OUT, `v8-${name}-${suffix}.png`), fullPage: true })
  }

  // Plus
  const plus = page.getByRole('button', { name: /Neu erstellen/i })
  if (await plus.count()) {
    await plus.first().click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: path.join(OUT, `v8-plus-${suffix}.png`), fullPage: true })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  }

  // Mehr
  const more = page.locator('nav[aria-label="Hauptnavigation"] button', { hasText: 'Mehr' })
  if (await more.count()) {
    await more.first().click()
    await page.waitForTimeout(700)
    await page.screenshot({ path: path.join(OUT, `v8-mehr-${suffix}.png`), fullPage: true })
  }

  await browser.close()
}

await shoot({ width: 390, height: 844 }, '390')
await shoot({ width: 430, height: 932 }, '430')
console.log(fs.readdirSync(OUT).filter((f) => f.startsWith('v8-')).sort().join('\n'))
