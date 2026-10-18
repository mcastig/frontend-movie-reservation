import { expect, test } from '@playwright/test'
import { signIn } from './helpers.ts'

// Needs an admin account from the seed: E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.
const email = process.env.E2E_ADMIN_EMAIL
const password = process.env.E2E_ADMIN_PASSWORD

test.describe('back office', () => {
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD')
  test.describe.configure({ mode: 'serial' })

  test('an admin adds a movie and schedules it for tomorrow', async ({ page }) => {
    const title = `E2E Feature ${Date.now()}`
    await signIn(page, email!, password!)

    await page.goto('/admin/movies/new')
    await page.getByLabel('Title').fill(title)
    await page.getByLabel('Description').fill('A movie made by the end-to-end tests.')
    await page.getByLabel('Length in minutes').fill('95')
    await page.getByRole('button', { name: 'Add movie' }).click()
    await expect(page.getByText(`${title} saved.`)).toBeVisible()

    await page.goto('/admin/schedule')
    await page.getByLabel('Movie').selectOption({ label: title })
    await page.getByLabel('Starts at').fill('23:00')
    await page.getByRole('button', { name: 'Schedule showtime' }).click()
    await expect(page.getByText(new RegExp(`^Scheduled ${title} on `))).toBeVisible()
  })

  test('a busy hall is explained against the time', async ({ page }) => {
    await signIn(page, email!, password!)
    await page.goto('/admin/schedule')
    // Same hall and time as the showtime scheduled above.
    await page.getByLabel('Starts at').fill('23:00')
    await page.getByRole('button', { name: 'Schedule showtime' }).click()
    await expect(page.getByText('The hall is busy at that time. Pick another time or hall.')).toBeVisible()
  })

  test('reports and bookings load', async ({ page }) => {
    await signIn(page, email!, password!)
    await page.goto('/admin/reports')
    await expect(page.getByRole('heading', { name: 'By showtime' })).toBeVisible()
    await page.goto('/admin/bookings')
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible()
  })

  test('a deleted movie with showtimes explains why it stays', async ({ page }) => {
    await signIn(page, email!, password!)
    await page.goto('/admin/movies')
    const row = page.getByRole('row', { name: /E2E Feature/ }).first()
    await row.getByRole('button', { name: 'Delete' }).click()
    await row.getByRole('button', { name: /^Yes, delete/ }).click()
    await expect(row.getByRole('alert')).toHaveText(/has showtimes, so it can’t be deleted/)
  })
})
