import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fail, hang, mockApi, type Route } from '../test/api'
import { at, guest, listings, page, reservation } from '../test/fixtures'
import { fakeAuth, renderPage, signedInAs } from '../test/render'
import { BookingsPage } from './Bookings'

const show = (days: number, title: string) => ({
  ...reservation().showtime,
  startsAt: at(days, '14:00'),
  movie: { id: days + 10, title },
})

const soon = reservation({
  id: 1,
  showtime: show(1, 'Soon'),
  seats: [
    { id: 4, row: 'B', number: 1, priceCents: 1200 },
    { id: 5, row: 'B', number: 2, priceCents: 1200 },
  ],
})
const later = reservation({ id: 2, showtime: show(5, 'Later'), seats: [{ id: 9, row: 'C', number: 7, priceCents: 1200 }] })
const past = reservation({ id: 3, showtime: show(-3, 'Long ago') })
const yesterday = reservation({ id: 4, showtime: show(-1, 'Yesterday') })
const cancelled = reservation({ id: 5, status: 'cancelled', showtime: show(2, 'Called off') })

function api(over: Record<string, Route> = {}) {
  return mockApi({
    'GET /movies/showtimes': listings(),
    'GET /reservations/me': page([later, past, cancelled, soon, yesterday]),
    ...over,
  })
}

const titlesIn = (name: string) =>
  within(screen.getByRole('region', { name })).getAllByRole('article').map((a) => a.querySelector('h3')!.textContent)

describe('BookingsPage', () => {
  it('splits bookings into coming up (soonest first) and past or cancelled (newest first)', async () => {
    api()
    renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await screen.findByRole('heading', { name: 'My bookings' })
    expect(document.title).toBe('My bookings')

    expect(titlesIn('Coming up')).toEqual(['Soon', 'Later'])
    expect(titlesIn('Past and cancelled')).toEqual(['Called off', 'Yesterday', 'Long ago'])
    const earlier = screen.getByRole('region', { name: 'Past and cancelled' })
    expect(within(earlier).getAllByText('Cancelled')).toHaveLength(1)
    expect(within(earlier).getAllByText('Past')).toHaveLength(2)
  })

  it('waits for the session before loading', () => {
    const server = api()
    renderPage(<BookingsPage />, { path: '/bookings', auth: fakeAuth({ status: 'loading' }) })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(server.matching('GET', '/reservations/me')).toHaveLength(0)
  })

  it('points to the listings when nothing is coming up', async () => {
    api({ 'GET /reservations/me': page([]) })
    renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
    expect(await screen.findByText('No upcoming bookings.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See what’s on today' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('region', { name: 'Past and cancelled' })).toBeNull()
  })

  it('shows errors with a retry', async () => {
    api({ 'GET /reservations/me': fail(500, 'INTERNAL_ERROR') })
    const view = renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    api({ 'GET /reservations/me': page([soon]) })
    await view.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Soon' })).toBeInTheDocument()
  })

  describe('cancelling', () => {
    it('asks first, and can be called off', async () => {
      api({ 'GET /reservations/me': page([soon]) })
      const view = renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
      await view.user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
      expect(screen.getByRole('group', { name: 'Confirm cancellation' })).toHaveTextContent(
        'Cancel Soon? Seats B1 and B2 will go back on sale.',
      )
      await view.user.click(screen.getByRole('button', { name: 'Keep booking' }))
      expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
    })

    it('cancels and confirms which seats are free', async () => {
      const server = api({
        'GET /reservations/me': page([soon]),
        'POST /reservations/{id}/cancel': reservation({ ...soon, status: 'cancelled' }),
      })
      const view = renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
      await view.user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
      await view.user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))
      expect(await screen.findByText('Booking cancelled. Seats B1 and B2 are free again.')).toBeInTheDocument()
      expect(server.matching('POST', '/reservations/1/cancel')).toHaveLength(1)
    })

    it('uses the singular for one seat', async () => {
      api({
        'GET /reservations/me': page([later]),
        'POST /reservations/{id}/cancel': reservation({ ...later, status: 'cancelled' }),
      })
      const view = renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
      await view.user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
      expect(screen.getByText('Cancel Later? Seat C7 will go back on sale.')).toBeInTheDocument()
      await view.user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))
      expect(await screen.findByText('Booking cancelled. Seat C7 is free again.')).toBeInTheDocument()
    })

    it('shows progress, then why it failed', async () => {
      let answer!: (response: Response) => void
      api({
        'GET /reservations/me': page([soon]),
        'POST /reservations/{id}/cancel': () => new Promise<Response>((resolve) => (answer = resolve)),
      })
      const view = renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
      await view.user.click(await screen.findByRole('button', { name: 'Cancel booking' }))
      await view.user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))
      expect(await screen.findByRole('button', { name: 'Cancelling…' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Keep booking' })).toBeDisabled()

      answer(fail(409, 'SHOWTIME_STARTED')())
      expect(await screen.findByRole('alert')).toHaveTextContent('This showtime has started')
    })
  })

  it('shows loading while bookings load', () => {
    api({ 'GET /reservations/me': hang })
    renderPage(<BookingsPage />, { path: '/bookings', auth: signedInAs(guest) })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
