import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fail, mockApi, type Ctx, type Route } from '../../test/api'
import { adminReservation, listings, page } from '../../test/fixtures'
import { renderPage } from '../../test/render'
import { AdminBookingsPage } from './AdminBookings'

const confirmed = adminReservation({
  id: 100,
  createdAt: '2026-10-18T09:30:00.000Z',
  showtime: { ...adminReservation().showtime, id: 10, startsAt: '2026-10-20T14:00:00.000Z' },
})
const cancelled = adminReservation({ id: 101, status: 'cancelled', user: { id: 8, name: 'Leo', email: 'leo@example.com' } })

function api(bookings: Route = page([confirmed, cancelled])) {
  return mockApi({ 'GET /movies/showtimes': listings(), 'GET /admin/reservations': bookings })
}

const lastQuery = (server: ReturnType<typeof api>) =>
  Object.fromEntries(new URL(server.matching('GET', '/admin/reservations').at(-1)!.url).searchParams)

const open = () => renderPage(<AdminBookingsPage />, { path: '/admin/bookings' })

describe('AdminBookingsPage', () => {
  it('lists bookings with guest, showtime, seats, total and status', async () => {
    const server = api()
    open()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    const rows = within(await screen.findByRole('table')).getAllByRole('row')
    expect(rows[1]).toHaveTextContent(
      '100Ana Ruizana@example.comInceptionTue 20 14:00, Hall 1, no. 10B2, B1$24.00ConfirmedSun 18 09:30',
    )
    expect(rows[2]).toHaveTextContent('Cancelled')
    expect(lastQuery(server)).toEqual({ limit: '25', page: '1' })
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull()
  })

  it('filters by showtime, status and showtime dates in the cinema’s timezone', async () => {
    const server = api()
    const view = open()
    await screen.findByRole('table')
    await view.user.type(screen.getByLabelText('Showtime number'), '10')
    await view.user.selectOptions(screen.getByLabelText('Status'), 'cancelled')
    fireEvent.change(screen.getByLabelText('Showtimes from'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-31' } })
    await view.user.click(screen.getByRole('button', { name: 'Show bookings' }))

    await screen.findByRole('table')
    expect(lastQuery(server)).toEqual({
      limit: '25',
      page: '1',
      showtimeId: '10',
      status: 'cancelled',
      from: '2026-10-01T00:00:00+00:00',
      to: '2026-11-01T00:00:00+00:00',
    })
  })

  it('drops empty filters', async () => {
    const server = api()
    const view = open()
    await screen.findByRole('table')
    await view.user.selectOptions(screen.getByLabelText('Status'), 'confirmed')
    await view.user.click(screen.getByRole('button', { name: 'Show bookings' }))
    await screen.findByRole('table')
    expect(lastQuery(server)).toEqual({ limit: '25', page: '1', status: 'confirmed' })

    await view.user.selectOptions(screen.getByLabelText('Status'), 'Any')
    await view.user.click(screen.getByRole('button', { name: 'Show bookings' }))
    await screen.findByRole('table')
    expect(lastQuery(server)).toEqual({ limit: '25', page: '1' })
  })

  it('pages through results', async () => {
    const server = api(({ query }: Ctx) =>
      page([query.get('page') === '2' ? cancelled : confirmed], { page: Number(query.get('page')), totalPages: 2, total: 30 }),
    )
    const view = open()
    expect(await screen.findByText('Page 1 of 2, 30 bookings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()

    await view.user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(await screen.findByText('Page 2 of 2, 30 bookings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(lastQuery(server).page).toBe('2')

    await view.user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(await screen.findByText('Page 1 of 2, 30 bookings')).toBeInTheDocument()
  })

  it('says when nothing matches', async () => {
    api(page([]))
    open()
    expect(await screen.findByText('No bookings match these filters.')).toBeInTheDocument()
  })

  it('shows errors with a retry', async () => {
    api(fail(500, 'INTERNAL_ERROR'))
    const view = open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    api()
    await view.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })
})
