import { test, expect, type Page } from '@playwright/test'
import path from 'node:path'

const ARTIFACTS = '/opt/cursor/artifacts/screenshots'

async function demoLogin(page: Page) {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Willkommen' })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole('button', { name: 'Code senden' }).click()
  const otpGroup = page.getByRole('group', { name: 'Bestätigungscode' })
  await expect(otpGroup).toBeVisible({ timeout: 10_000 })
  const firstDigit = otpGroup.locator('input').first()
  await firstDigit.focus()
  // OtpInput: tippe 6 Ziffern (onComplete verifiziert automatisch)
  await page.keyboard.type('123456')
  await page.waitForURL((url) => url.pathname === '/', { timeout: 20_000 }).catch(async () => {
    const confirm = page.getByRole('button', { name: /anmelden|bestätigen|code prüfen/i })
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click()
    }
    await page.waitForURL((url) => url.pathname === '/', { timeout: 20_000 })
  })
  await expect(page.getByRole('navigation', { name: /hauptnavigation/i })).toBeVisible({
    timeout: 20_000,
  })
}

async function createViaPlanning(page: Page, type: string, title: string) {
  await page.goto(`/planen/neu?type=${type}`)
  await expect(page.getByLabel('Titel').or(page.getByPlaceholder(/titel/i))).toBeVisible({
    timeout: 15_000,
  })
  const titleInput = page.getByLabel('Titel').or(page.getByPlaceholder(/titel/i)).first()
  await titleInput.fill(title)
  await page.getByRole('button', { name: 'Speichern' }).click()
  await page.waitForURL(/\/entities\//, { timeout: 20_000 })
}

async function createMoment(page: Page, title: string) {
  await page.goto('/erinnerungen/neu')
  const titleInput = page.getByLabel('Titel').or(page.getByPlaceholder(/titel/i)).first()
  await expect(titleInput).toBeVisible({ timeout: 15_000 })
  await titleInput.fill(title)
  await page.getByRole('button', { name: 'Festhalten' }).click()
  await page.waitForURL(/\/entities\/moment\//, { timeout: 20_000 })
}

async function openHomeMomentsSection(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Letzte Momente' })).toBeVisible({
    timeout: 20_000,
  })
}

test.describe('SharedLife V7 dashboard @requires-demo', () => {
  // Gemeinsame IndexedDB im Demo-Origin — Tests nicht parallelisieren.
  test.describe.configure({ mode: 'serial' })
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('Nicht-Momente erscheinen nicht unter Letzte Momente; echter Moment schon', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await demoLogin(page)

    const recipeTitle = `V7 Rezept ${Date.now()}`
    const wishTitle = `V7 Wunsch ${Date.now()}`
    const leisureTitle = `V7 Idee ${Date.now()}`
    const dateTitle = `V7 Date ${Date.now()}`
    const momentTitle = `V7 Moment ${Date.now()}`

    await createViaPlanning(page, 'recipe', recipeTitle)
    await createViaPlanning(page, 'wish', wishTitle)
    await createViaPlanning(page, 'leisure', leisureTitle)
    await createViaPlanning(page, 'date', dateTitle)
    await createMoment(page, momentTitle)

    await openHomeMomentsSection(page)

    const momentsHeading = page.getByRole('heading', { name: 'Letzte Momente' })
    await expect(momentsHeading).toBeVisible()
    const section = page.locator('section', { has: momentsHeading })
    await expect(section.getByText(momentTitle)).toBeVisible()
    await expect(section.getByText(recipeTitle)).toHaveCount(0)
    await expect(section.getByText(wishTitle)).toHaveCount(0)
    await expect(section.getByText(leisureTitle)).toHaveCount(0)
    await expect(section.getByText(dateTitle)).toHaveCount(0)

    await page.screenshot({
      path: path.join(ARTIFACTS, 'v7-dashboard-mobile.png'),
      fullPage: true,
    })
  })

  test('Wunsch Herzenswunsch in Liste und Detail; Reload behält Priorität', async ({ page }) => {
    test.setTimeout(90_000)
    await demoLogin(page)
    const title = `V7 Prioritätstest ${Date.now()}`
    await page.goto('/planen/neu?type=wish')
    await page.getByLabel('Titel').or(page.getByPlaceholder(/titel/i)).first().fill(title)
    await page.getByRole('radio', { name: 'Herzenswunsch' }).click()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'v7-wish-form-priority.png'),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Speichern' }).click()
    await page.waitForURL(/\/entities\/wish\//, { timeout: 20_000 })

    await expect(page.getByText('Herzenswunsch', { exact: true })).toBeVisible()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'v7-wish-detail-priority.png'),
      fullPage: true,
    })

    await page.goto('/module/geschenke')
    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByText('Herzenswunsch', { exact: true })).toBeVisible()
    await page.screenshot({
      path: path.join(ARTIFACTS, 'v7-wish-list-priority.png'),
      fullPage: true,
    })

    await page.reload()
    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByText('Herzenswunsch', { exact: true })).toBeVisible()

    await page.getByText(title).click()
    await page.getByRole('button', { name: 'Mehr Optionen' }).click()
    await page.getByRole('menuitem', { name: 'Bearbeiten' }).click()
    const high = page.getByRole('radio', { name: 'Hoch' })
    await high.click()
    await expect(high).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByRole('heading', { name: /bearbeiten/i })).toHaveCount(0, {
      timeout: 15_000,
    })
    await expect(page.getByRole('definition').filter({ hasText: 'Hoch' })).toBeVisible({
      timeout: 15_000,
    })
    await page.reload()
    await expect(page.getByRole('definition').filter({ hasText: 'Hoch' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Plus- und Mehr-Sheet: Drag, Backdrop, Escape', async ({ page }) => {
    await demoLogin(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'Neu erstellen' }).click()
    await expect(page.getByTestId('bottom-sheet')).toBeVisible()
    await page.screenshot({ path: path.join(ARTIFACTS, 'v7-plus-sheet.png') })

    const handle = page.getByTestId('bottom-sheet-handle')
    const box = await handle.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 8)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 220, { steps: 12 })
    await page.mouse.up()
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0, { timeout: 5_000 })

    await page.getByRole('button', { name: 'Mehr' }).click()
    await expect(page.getByTestId('bottom-sheet')).toBeVisible()
    await page.screenshot({ path: path.join(ARTIFACTS, 'v7-more-sheet.png') })
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0)

    await page.getByRole('button', { name: 'Mehr' }).click()
    await page.getByRole('button', { name: 'Schliessen' }).click()
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0)

    await page.getByRole('button', { name: 'Neu erstellen' }).click()
    const handle2 = page.getByTestId('bottom-sheet-handle')
    const box2 = await handle2.boundingBox()
    await page.mouse.move(box2!.x + box2!.width / 2, box2!.y + 8)
    await page.mouse.down()
    await page.mouse.move(box2!.x + box2!.width / 2, box2!.y + 40, { steps: 6 })
    await page.mouse.up()
    await expect(page.getByTestId('bottom-sheet')).toBeVisible()
    await page.keyboard.press('Escape')
  })
})

test.describe('SharedLife V7 desktop screenshot @requires-demo', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('Dashboard Desktop Screenshot', async ({ page }) => {
    await demoLogin(page)
    await createMoment(page, `V7 Desktop Moment ${Date.now()}`)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Heute für uns' })).toBeVisible({
      timeout: 20_000,
    })
    await page.screenshot({
      path: path.join(ARTIFACTS, 'v7-dashboard-desktop.png'),
      fullPage: true,
    })
  })
})
