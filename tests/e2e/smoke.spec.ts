import { test, expect } from '@playwright/test'

test.describe('SharedLife smoke @requires-env', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/E-Mail|OTP|Code/i).first()).toBeVisible()
  })

  test('nav shell on home', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation', { name: /hauptnavigation/i })).toBeVisible()
    await expect(page.getByText('Home')).toBeVisible()
    await expect(page.getByText('Planen')).toBeVisible()
    await expect(page.getByText('Momente')).toBeVisible()
    await expect(page.getByText('Mehr')).toBeVisible()
  })
})

test.describe('SharedLife smoke', () => {
  test('app loads without crash', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })
})
