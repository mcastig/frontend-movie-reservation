import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Both lighting states: the lobby (lights up) and the seat plan (lights down).
for (const path of ['/', '/signin', '/showtimes/1']) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
}

test('the style guide passes axe in both lighting states', async ({ page }) => {
  test.skip(!!process.env.E2E_BASE_URL?.includes('onrender.com'), 'The style guide is dev only')
  await page.goto('/styleguide')
  await expect(page.getByRole('heading', { name: 'Style guide' })).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
})

test('the lights change instantly with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/showtimes/1')
  await expect(page.locator('html')).toHaveAttribute('data-lights', 'down')
  const duration = await page.evaluate(() => getComputedStyle(document.body).transitionDuration)
  expect(parseFloat(duration)).toBeLessThan(0.01)
})
