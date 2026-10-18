import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SeatPlan as Plan } from '../api/types'
import { addDays, formatDayOf } from '../lib/time'
import { fail, hang, mockApi, type Route } from '../test/api'
import { at, guest, listings, reservation, seatPlan, today } from '../test/fixtures'
import { locationOf, renderPage, signedInAs, stateOf } from '../test/render'
import { ShowtimePage } from './Showtime'

// Row A: A1 A2 (A3 taken); row B: B1 B2 B3.
function api(plan: Route = seatPlan(), over: Record<string, Route> = {}) {
  return mockApi({ 'GET /movies/showtimes': listings(), 'GET /showtimes/{id}/seats': plan, ...over })
}

const open = (path = '/showtimes/10', auth = signedInAs(guest)) =>
  renderPage(<ShowtimePage />, { path, route: '/showtimes/:id', auth })

const seat = (code: string) => {
  const [, row, number] = code.match(/^([A-Z])(\d+)$/)!
  return screen.getByRole('button', { name: new RegExp(`^Row ${row}, seat ${number},`) })
}
const tray = () => screen.getByRole('complementary', { name: 'Your seats' })
const stubs = () => within(tray()).queryAllByRole('button', { name: /^Remove/ }).map((b) => b.textContent!.replace('×', ''))
const hint = () => within(tray()).getByRole('status')

// One row of 12 free seats, to reach the 10-seat limit.
const wideRow: Plan['rows'] = [
  { row: 'A', seats: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, number: i + 1, available: true })) },
]

describe('ShowtimePage', () => {
  it('dims the lights while loading', async () => {
    api(hang)
    open()
    expect(screen.getByText('Dimming the lights…')).toBeInTheDocument()
    expect(document.documentElement.dataset.lights).toBe('down')
  })

  it('shows the showtime and its seat plan', async () => {
    api()
    open()
    const heading = await screen.findByRole('heading', { level: 1 })
    const day = formatDayOf(at(1, '14:00'), 'UTC')
    expect(heading).toHaveTextContent(`Back to listings. Inception${day}, 14:00, Hall 1, $12.00 a seat`)
    expect(within(heading).getByRole('link')).toHaveAttribute('href', `/?date=${addDays(today(), 1)}`)
    expect(document.title).toBe(`Inception, ${day} 14:00`)
    expect(hint()).toHaveTextContent('Pick up to 10 seats. 5 free.')
    expect(stubs()).toEqual([])
  })

  it('says when the showtime has started, linking back to today', async () => {
    api(seatPlan({ startsAt: at(0, '00:00') }))
    open()
    expect(await screen.findByText('This showtime has started. Pick another one.')).toBeInTheDocument()
    expect(within(screen.getByRole('heading', { level: 1 })).getByRole('link')).toHaveAttribute('href', '/')
    expect(screen.queryByRole('group', { name: 'Seats' })).toBeNull()
    expect(screen.queryByRole('complementary')).toBeNull()
  })

  it('says when it’s sold out', async () => {
    api(seatPlan({}, [{ row: 'A', seats: [{ id: 1, number: 1, available: false }] }]))
    open()
    expect(await screen.findByText('Sold out. Pick another showtime.')).toBeInTheDocument()
  })

  it('shows the not-found page for a missing showtime', async () => {
    api(fail(404, 'NOT_FOUND'))
    open('/showtimes/404')
    expect(await screen.findByRole('heading', { name: 'This page isn’t showing' })).toBeInTheDocument()
  })

  it('shows other errors with a retry', async () => {
    api(fail(503, 'INTERNAL_ERROR'))
    const view = open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')
    api()
    await view.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('group', { name: 'Seats' })).toBeInTheDocument()
  })

  describe('picking seats', () => {
    it('adds seats as sorted stubs and prices the booking', async () => {
      api()
      const view = open()
      await view.user.click(await screen.findByRole('button', { name: /^Row B, seat 2/ }))
      expect(stubs()).toEqual(['B2'])
      expect(screen.getByRole('button', { name: 'Book 1 seat, $12.00' })).toBeInTheDocument()
      expect(hint()).toHaveTextContent('Tap a stub to give the seat back.')

      await view.user.click(seat('A2'))
      await view.user.click(seat('B1'))
      expect(stubs()).toEqual(['A2', 'B1', 'B2'])
      expect(screen.getByRole('button', { name: 'Book 3 seats, $36.00' })).toBeInTheDocument()

      // Clicking a picked seat or its stub gives it back.
      await view.user.click(seat('B1'))
      await view.user.click(screen.getByRole('button', { name: 'Remove A2' }))
      expect(stubs()).toEqual(['B2'])
    })

    it('stops at 10 seats', async () => {
      api(seatPlan({}, wideRow))
      const view = open('/showtimes/10?seats=1,2,3,4,5,6,7,8,9,10,11')
      await screen.findByRole('group', { name: 'Seats' })
      expect(stubs()).toHaveLength(10)
      expect(hint()).toHaveTextContent('That’s 10 seats, the most for one booking.')

      await view.user.click(seat('A12'))
      expect(hint()).toHaveTextContent('You can book up to 10 seats at once.')
      expect(stubs()).toHaveLength(10)

      // Any change clears the notice.
      await view.user.click(seat('A1'))
      expect(hint()).toHaveTextContent('Tap a stub to give the seat back.')
    })
  })

  describe('picks from the URL', () => {
    it('keeps valid picks and ignores junk', async () => {
      api()
      open('/showtimes/10?seats=4,abc,0,1')
      await screen.findByRole('group', { name: 'Seats' })
      expect(stubs()).toEqual(['A1', 'B1'])
    })

    it('quietly drops seats that aren’t in this hall', async () => {
      api()
      open('/showtimes/10?seats=1,99')
      await screen.findByRole('group', { name: 'Seats' })
      expect(stubs()).toEqual(['A1'])
      expect(hint()).toHaveTextContent('Tap a stub')
    })

    it('names a seat someone else booked meanwhile', async () => {
      api()
      open('/showtimes/10?seats=3,1')
      await screen.findByRole('group', { name: 'Seats' })
      expect(stubs()).toEqual(['A1'])
      expect(hint()).toHaveTextContent('A3 was just booked by someone else. Pick another seat.')
    })

    it('names several seats someone else booked', async () => {
      api(
        seatPlan({}, [
          {
            row: 'A',
            seats: [
              { id: 1, number: 1, available: false },
              { id: 2, number: 2, available: false },
              { id: 3, number: 3, available: true },
            ],
          },
        ]),
      )
      open('/showtimes/10?seats=1,2')
      await screen.findByRole('group', { name: 'Seats' })
      expect(stubs()).toEqual([])
      expect(hint()).toHaveTextContent('A1 and A2 were just booked by someone else. Pick other seats.')
    })
  })

  describe('booking', () => {
    it('sends signed-out visitors to sign in, keeping their picks', async () => {
      api()
      const view = open('/showtimes/10', signedInAs(guest, { status: 'signedOut', user: null }))
      await view.user.click(await screen.findByRole('button', { name: /^Row A, seat 1/ }))
      await view.user.click(seat('B3'))
      await view.user.click(screen.getByRole('button', { name: /^Book 2 seats/ }))
      expect(locationOf(view)).toBe('/signin')
      expect(stateOf(view)).toEqual({ from: { pathname: '/showtimes/10', search: '?seats=1,6' }, reason: 'book' })
    })

    it('books, confirms and shows the booking', async () => {
      const server = api(seatPlan(), {
        'POST /reservations': reservation({ id: 55, showtime: { ...reservation().showtime, startsAt: at(1, '14:00') } }),
      })
      const view = open()
      await view.user.click(await screen.findByRole('button', { name: /^Row B, seat 1/ }))
      await view.user.click(screen.getByRole('button', { name: 'Book 1 seat, $12.00' }))

      expect(await screen.findByText(`Booked. See you on ${formatDayOf(at(1), 'UTC')} at 14:00.`)).toBeInTheDocument()
      expect(locationOf(view)).toBe('/bookings?booked=55')
      expect(await server.body('POST', '/reservations')).toEqual({ showtimeId: 10, seatIds: [4] })
    })

    it('shows progress while booking', async () => {
      api(seatPlan(), { 'POST /reservations': hang })
      const view = open()
      await view.user.click(await screen.findByRole('button', { name: /^Row B, seat 1/ }))
      await view.user.click(screen.getByRole('button', { name: /^Book/ }))
      expect(screen.getByRole('button', { name: 'Booking…' })).toBeDisabled()
    })

    it('refreshes the plan when a seat was just taken, and names it', async () => {
      let taken = false
      api(
        () => {
          const plan = seatPlan()
          if (taken) plan.rows[1].seats[0].available = false
          return plan
        },
        {
          'POST /reservations': () => {
            taken = true
            return fail(409, 'SEATS_TAKEN')()
          },
        },
      )
      const view = open()
      await view.user.click(await screen.findByRole('button', { name: /^Row B, seat 1/ }))
      await view.user.click(seat('B2'))
      await view.user.click(screen.getByRole('button', { name: /^Book/ }))

      expect(await screen.findByText('B1 was just booked by someone else. Pick another seat.')).toBeInTheDocument()
      expect(stubs()).toEqual(['B2'])
    })

    it('shows other booking errors', async () => {
      api(seatPlan(), { 'POST /reservations': fail(409, 'SHOWTIME_STARTED') })
      const view = open()
      await view.user.click(await screen.findByRole('button', { name: /^Row B, seat 1/ }))
      await view.user.click(screen.getByRole('button', { name: /^Book/ }))
      expect(await screen.findByText('This showtime has started, so the booking can’t be cancelled.')).toBeInTheDocument()
      expect(stubs()).toEqual(['B1'])
    })
  })
})
