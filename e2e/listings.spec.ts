import { expect, test } from '@playwright/test'

test('from the listings to a showtime in two taps', async ({ page }) => {
  await page.goto('/')
  // Find a day with showtimes (the seed schedules the coming days).
  const days = page.getByRole('navigation', { name: 'Day' }).getByRole('link')
  await expect(days.first()).toBeVisible()
  const times = page.locator('a[href^="/showtimes/"]')
  for (let i = 0; i < (await days.count()); i++) {
    await days.nth(i).click()
    await expect(times.first().or(page.getByText(/^Nothing showing on /))).toBeVisible()
    if (await times.count()) break
  }
  await page.locator('a[href^="/showtimes/"]').first().click()
  await expect(page).toHaveURL(/\/showtimes\/\d+/)
  await expect(page.getByRole('group', { name: 'Seats' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-lights', 'down')
})

test.describe('in another timezone', () => {
  test.use({ timezoneId: 'Asia/Tokyo' })

  test('times match the cinema’s timezone, not the browser’s', async ({ page, request }) => {
    const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3000'
    let listing: { timezone: string; movies: { showtimes: { startsAt: string }[] }[] } | undefined
    let date = ''
    for (let i = 0; i < 7 && !listing?.movies.length; i++) {
      date = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10)
      listing = await (await request.get(`${apiUrl}/movies/showtimes?date=${date}`)).json()
    }
    test.skip(!listing?.movies.length, 'No showtimes in the next 7 days')

    const first = listing!.movies[0].showtimes[0].startsAt
    const expected = new Intl.DateTimeFormat('en-GB', {
      timeZone: listing!.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(first))

    await page.goto(`/?date=${date}`)
    await expect(page.locator('a[href^="/showtimes/"]').first()).toHaveText(expected)
  })
})

test('an empty day says so', async ({ page }) => {
  await page.goto('/')
  const days = page.getByRole('navigation', { name: 'Day' }).getByRole('link')
  await expect(days.first()).toBeVisible()
  for (let i = 0; i < (await days.count()); i++) {
    await days.nth(i).click()
    await expect(page.locator('a[href^="/showtimes/"]').first().or(page.getByText(/^Nothing showing on /))).toBeVisible()
    if (await page.getByText(/^Nothing showing on /).count()) {
      await expect(page.getByText(/Try another day\.$/)).toBeVisible()
      return
    }
  }
  test.skip(true, 'Every day this week has showtimes')
})
