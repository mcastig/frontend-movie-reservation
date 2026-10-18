import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays, formatDay } from '../../lib/time'
import { fail, hang, mockApi, type Route } from '../../test/api'
import { hall1, listings, today } from '../../test/fixtures'
import type { MovieReport, ShowtimeReport } from '../../api/types'
import { renderPage } from '../../test/render'
import { AdminReportsPage } from './AdminReports'

const row = (id: number, occupancyPct: number) => ({
  id,
  startsAt: '2026-10-20T14:00:00.000Z',
  movie: { id: 1, title: 'Inception' },
  hall: hall1,
  capacity: 50,
  ticketsSold: 40,
  occupancyPct,
  revenueCents: 48000,
  cancelledReservations: 2,
})

const showtimes: ShowtimeReport = {
  range: { from: '', to: '' },
  totals: { showtimes: 3, capacity: 150, ticketsSold: 90, occupancyPct: 60.4, revenueCents: 108000, cancelledReservations: 5 },
  showtimes: [row(1, 80), row(2, 120), row(3, -5)],
}

const movies: MovieReport = {
  range: { from: '', to: '' },
  totals: { ticketsSold: 90, revenueCents: 108000 },
  movies: [
    { id: 1, title: 'Inception', ticketsSold: 60, revenueCents: 72000 },
    { id: 2, title: 'Up', ticketsSold: 30, revenueCents: 36000 },
  ],
}

function api(over: Record<string, Route> = {}) {
  return mockApi({
    'GET /movies/showtimes': listings(),
    'GET /admin/reports/showtimes': showtimes,
    'GET /admin/reports/movies': movies,
    ...over,
  })
}

// Both reports are on screen.
async function loaded() {
  await screen.findByText('Cancelled bookings')
  await screen.findByRole('cell', { name: 'Total' })
}

const open = () => renderPage(<AdminReportsPage />, { path: '/admin/reports' })
const query = (server: ReturnType<typeof api>, path: string) =>
  Object.fromEntries(new URL(server.matching('GET', path).at(-1)!.url).searchParams)

describe('AdminReportsPage', () => {
  it('reports the last 30 days and the next 7 by default', async () => {
    const server = api()
    open()
    const from = addDays(today(), -30)
    const to = addDays(today(), 7)
    expect(screen.getByText(`Showtimes starting ${formatDay(from)} to ${formatDay(to)}, in UTC.`)).toBeInTheDocument()
    expect(screen.getAllByText('Loading…')).toHaveLength(2)

    await loaded()
    expect(query(server, '/admin/reports/showtimes')).toEqual({ from: `${from}T00:00:00+00:00`, to: `${addDays(to, 1)}T00:00:00+00:00` })
    expect(screen.getByLabelText('From')).toHaveValue(from)
  })

  it('shows totals, each showtime and each movie', async () => {
    api()
    open()
    await loaded()
    const totals = screen.getByText('Cancelled bookings').closest('dl')!
    expect(totals).toHaveTextContent('Revenue$1,080.00Tickets sold90 of 150Occupancy60%Showtimes3Cancelled bookings5')

    const [byShowtime, byMovie] = screen.getAllByRole('table')
    const rows = within(byShowtime).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Tue 20 14:00InceptionHall 180%40 of 50$480.002')
    // Bars stay within 0–100%, the label keeps the real number.
    const bars = byShowtime.querySelectorAll<HTMLElement>('[style]')
    expect([...bars].map((b) => b.style.width)).toEqual(['80%', '100%', '0%'])
    expect(rows[2]).toHaveTextContent('120%')

    expect(within(byMovie).getAllByRole('row').map((r) => r.textContent)).toEqual([
      'MovieTickets soldRevenue',
      'Inception60$720.00',
      'Up30$360.00',
      'Total90$1,080.00',
    ])
  })

  it('reports a chosen range, in either order', async () => {
    const server = api()
    const view = open()
    await loaded()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-31' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } })
    await view.user.click(screen.getByRole('button', { name: 'Show report' }))
    expect(await screen.findByText('Showtimes starting Thu 1 to Sat 31, in UTC.')).toBeInTheDocument()
    expect(query(server, '/admin/reports/movies')).toEqual({ from: '2026-10-01T00:00:00+00:00', to: '2026-11-01T00:00:00+00:00' })

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-09-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-09-30' } })
    await view.user.click(screen.getByRole('button', { name: 'Show report' }))
    expect(await screen.findByText('Showtimes starting Tue 1 to Wed 30, in UTC.')).toBeInTheDocument()
  })

  it('ignores a range with a missing end', async () => {
    api()
    open()
    await loaded()
    const before = screen.getByText(/^Showtimes starting/).textContent
    // The browser blocks this submit (the fields are required); the page doesn't rely on that.
    const form = screen.getByRole('button', { name: 'Show report' }).closest('form')!
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '' } })
    fireEvent.submit(form)
    expect(screen.getByText(/^Showtimes starting/).textContent).toBe(before)

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } })
    fireEvent.submit(form)
    expect(screen.getByText(/^Showtimes starting/).textContent).toBe(before)
  })

  it('says when there’s nothing in range', async () => {
    api({
      'GET /admin/reports/showtimes': { ...showtimes, showtimes: [] },
      'GET /admin/reports/movies': { ...movies, movies: [] },
    })
    open()
    expect(await screen.findByText('No showtimes in this range. Try a wider range.')).toBeInTheDocument()
    expect(await screen.findByText('No tickets sold in this range.')).toBeInTheDocument()
  })

  it('shows each report’s errors with a retry', async () => {
    api({ 'GET /admin/reports/showtimes': fail(500, 'INTERNAL_ERROR'), 'GET /admin/reports/movies': fail(403, 'FORBIDDEN') })
    const view = open()
    const [first, second] = await screen.findAllByRole('alert')
    expect(first).toHaveTextContent('Something went wrong')
    expect(second).toHaveTextContent('You don’t have access to this.')

    api({ 'GET /admin/reports/movies': hang })
    await view.user.click(within(first).getByRole('button', { name: 'Try again' }))
    await view.user.click(within(second).getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Cancelled bookings')).toBeInTheDocument()
  })
})
