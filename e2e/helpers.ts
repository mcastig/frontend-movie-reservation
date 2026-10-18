import { expect, type Page } from '@playwright/test'

export async function signUp(page: Page, name = 'E2E Guest') {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const password = 'correct-horse-battery'
  await page.goto('/signup')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('link', { name: 'My bookings' })).toBeVisible()
  return { email, password }
}

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/signin')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

export const seat = (page: Page, row: string, number: number) =>
  page.getByRole('button', { name: new RegExp(`^Row ${row}, seat ${number},`) })
