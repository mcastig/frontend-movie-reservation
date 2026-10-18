import { expect, test } from '@playwright/test'
import { seat, signIn, signUp } from './helpers.ts'

// These tests book and cancel seats: run them only against the local, seeded API.
test.describe.configure({ mode: 'serial' })

test('a session survives a reload, and sign-out works', async ({ page }) => {
  await signUp(page)
  await page.reload()
  await expect(page.getByRole('link', { name: 'My bookings' })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
})

test('wrong credentials get a clear message', async ({ page }) => {
  await page.goto('/signin')
  await page.getByLabel('Email').fill('nobody@example.com')
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toHaveText(/Email or password is incorrect\.|Too many attempts/)
})

test('signed-out visitors come back to the same seats after signing in', async ({ page, browser }) => {
  const other = await browser.newPage()
  const account = await signUp(other)
  await other.close()

  await page.goto('/showtimes/1')
  await seat(page, 'C', 1).click()
  await page.getByRole('button', { name: /^Book 1 seat, / }).click()
  await expect(page).toHaveURL(/\/signin/)
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/showtimes\/1\?seats=/)
  await expect(seat(page, 'C', 1)).toHaveAttribute('aria-pressed', 'true')
})

test('books B3 and B4 by keyboard, a second browser gets the friendly conflict, and cancelling frees them', async ({
  page,
  browser,
}) => {
  const first = await signUp(page, 'First Guest')
  const secondPage = await browser.newPage()
  await signUp(secondPage, 'Second Guest')

  // Both pick B4 before either books.
  await page.goto('/showtimes/1')
  await secondPage.goto('/showtimes/1')
  await seat(secondPage, 'B', 4).click()

  // Keyboard only: focus a seat, arrow to B3, pick it and B4.
  await seat(page, 'B', 1).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(seat(page, 'B', 3)).toBeFocused()
  await page.keyboard.press('Space')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Remove B3' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove B4' })).toBeVisible()

  await page.getByRole('button', { name: /^Book 2 seats, / }).click()
  await expect(page.getByText(/^Booked\. See you on /)).toBeVisible()
  await expect(page).toHaveURL(/\/bookings/)

  await secondPage.getByRole('button', { name: /^Book 1 seat, / }).click()
  await expect(secondPage.getByText('B4 was just booked by someone else. Pick another seat.')).toBeVisible()
  await expect(seat(secondPage, 'B', 4)).toBeDisabled()
  await secondPage.close()

  // Cancel, then the seat plan shows them as available again.
  await signIn(page, first.email, first.password)
  await page.goto('/bookings')
  await page.getByRole('button', { name: 'Cancel booking' }).first().click()
  await page.getByRole('button', { name: 'Yes, cancel booking' }).click()
  await expect(page.getByText('Booking cancelled. Seats B3 and B4 are free again.')).toBeVisible()
  await page.goto('/showtimes/1')
  await expect(seat(page, 'B', 3)).toBeEnabled()
  await expect(seat(page, 'B', 4)).toBeEnabled()
})

test('stops at 10 seats and says why', async ({ page }) => {
  await page.goto('/showtimes/1')
  const free = page.locator('button[aria-pressed="false"]')
  for (let i = 0; i < 10; i++) await free.first().click()
  await expect(page.getByRole('button', { name: /^Book 10 seats, / })).toBeVisible()
  await free.first().click()
  await expect(page.getByText('You can book up to 10 seats at once.')).toBeVisible()
})
