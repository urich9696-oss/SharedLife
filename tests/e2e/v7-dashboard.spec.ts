import { test, expect, type Page, type TestInfo } from '@playwright/test'

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

/** Touch-/Pointer-Drag (nicht mouse) auf ein Locator-Element. */
async function touchDragOn(
  page: Page,
  selector: string,
  deltaY: number,
  steps = 12,
) {
  await page.locator(selector).evaluate(
    (el, { dy, stepCount }) => {
      const rect = el.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + Math.min(10, Math.max(4, rect.height / 2))
      const fire = (type: string, clientY: number) => {
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'touch',
            clientX: x,
            clientY,
            button: 0,
          }),
        )
      }
      fire('pointerdown', y)
      for (let i = 1; i <= stepCount; i += 1) {
        fire('pointermove', y + (dy * i) / stepCount)
      }
      fire('pointerup', y + dy)
    },
    { dy: deltaY, stepCount: steps },
  )
}

async function shot(page: Page, testInfo: TestInfo, name: string, fullPage = false) {
  await page.screenshot({
    path: testInfo.outputPath(name),
    fullPage,
  })
}

test.describe('SharedLife V7 dashboard @requires-demo', () => {
  test.describe.configure({ mode: 'serial' })
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  test('Nicht-Momente erscheinen nicht unter Letzte Momente; echter Moment schon', async ({
    page,
  }, testInfo) => {
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

    await shot(page, testInfo, 'v7-dashboard-mobile.png', true)
  })

  test('Wunsch Herzenswunsch in Liste und Detail; Reload behält Priorität', async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    await demoLogin(page)
    const title = `V7 Prioritätstest ${Date.now()}`
    await page.goto('/planen/neu?type=wish')
    await page.getByLabel('Titel').or(page.getByPlaceholder(/titel/i)).first().fill(title)
    await page.getByRole('radio', { name: 'Herzenswunsch' }).click()
    await shot(page, testInfo, 'v7-wish-form-priority.png', true)
    await page.getByRole('button', { name: 'Speichern' }).click()
    await page.waitForURL(/\/entities\/wish\//, { timeout: 20_000 })

    await expect(page.getByText('Herzenswunsch', { exact: true })).toBeVisible()
    await shot(page, testInfo, 'v7-wish-detail-priority.png', true)

    await page.goto('/module/geschenke')
    await expect(page.getByText(title)).toBeVisible()
    await expect(page.getByText('Herzenswunsch', { exact: true })).toBeVisible()
    await shot(page, testInfo, 'v7-wish-list-priority.png', true)

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

  test('Plus- und Mehr-Sheet: Touch-Drag, Backdrop, Escape, Schwellwert', async ({
    page,
  }, testInfo) => {
    await demoLogin(page)
    await page.goto('/')

    await page.getByRole('button', { name: 'Neu erstellen' }).click()
    await expect(page.getByTestId('bottom-sheet')).toBeVisible()
    await shot(page, testInfo, 'v7-plus-sheet.png')

    // Unter Schwellwert → bleibt offen
    await touchDragOn(page, '[data-testid="bottom-sheet-handle"]', 40)
    await expect(page.getByTestId('bottom-sheet')).toBeVisible()
    await expect(page.getByTestId('bottom-sheet')).toHaveAttribute('data-enter-anim', 'off')

    // Über Schwellwert → schließt
    await touchDragOn(page, '[data-testid="bottom-sheet-handle"]', 180)
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0, { timeout: 5_000 })

    await page.getByRole('button', { name: 'Mehr' }).click()
    await expect(page.getByTestId('bottom-sheet')).toBeVisible()
    await shot(page, testInfo, 'v7-more-sheet.png')

    // Content leicht nach oben: kein Schließen
    await touchDragOn(page, '[data-testid="bottom-sheet-scroll"]', -40)
    await expect(page.getByTestId('bottom-sheet')).toBeVisible()

    // Content klar nach unten über Schwellwert → schließt
    await touchDragOn(page, '[data-testid="bottom-sheet-scroll"]', 180)
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0, { timeout: 5_000 })

    await page.getByRole('button', { name: 'Mehr' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0)

    await page.getByRole('button', { name: 'Mehr' }).click()
    await page.getByRole('button', { name: 'Schliessen' }).click()
    await expect(page.getByTestId('bottom-sheet')).toHaveCount(0)
  })
})

test.describe('SharedLife V7 desktop screenshot @requires-demo', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('Dashboard Desktop Screenshot', async ({ page }, testInfo) => {
    await demoLogin(page)
    await createMoment(page, `V7 Desktop Moment ${Date.now()}`)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Heute für uns' })).toBeVisible({
      timeout: 20_000,
    })
    await shot(page, testInfo, 'v7-dashboard-desktop.png', true)
  })
})
