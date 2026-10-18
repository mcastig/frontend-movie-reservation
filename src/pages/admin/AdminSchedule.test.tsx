import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays, formatDay, formatDayOf } from '../../lib/time'
import { fail, hang, mockApi, type Route } from '../../test/api'
import { at, hall1, hall2, listed, listings, movie, page, showtime, today } from '../../test/fixtures'
import { renderPage } from '../../test/render'
import { AdminSchedulePage } from './AdminSchedule'

const up = movie({ id: 2, title: 'Up', durationMinutes: 96 })

// Tomorrow: Inception at 20:00 and 14:00 in Hall 2, Up at 18:00 in Hall 1.
// In ten days (next week only): Up in Hall 1.
function day({ query }: { query: URLSearchParams }) {
  const date = query.get('date')!
  if (date === addDays(today(), 1))
    return listings(
      [
        listed({}, [
          showtime({ id: 21, startsAt: at(1, '20:00'), endsAt: at(1, '22:43'), hall: hall2 }),
          showtime({ id: 20, startsAt: at(1, '14:00'), endsAt: at(1, '16:43'), hall: hall2 }),
        ]),
        listed(up, [showtime({ id: 22, startsAt: at(1, '18:00'), endsAt: at(1, '19:36'), hall: hall1, seatsAvailable: 4 })]),
      ],
      date,
    )
  if (date === addDays(today(), 10))
    return listings([listed(up, [showtime({ id: 30, startsAt: at(10, '12:00'), hall: hall1 })])], date)
  return listings([], date)
}

function api(over: Record<string, Route> = {}) {
  return mockApi({ 'GET /movies/showtimes': day, 'GET /movies': page([movie(), up]), ...over })
}

const open = () => renderPage(<AdminSchedulePage />, { path: '/admin/schedule' })
const grid = () => screen.getByRole('table')
const cell = (day: string, hall: number) => {
  const row = within(grid()).getByRole('rowheader', { name: day }).closest('tr')!
  return within(row).getAllByRole('cell')[hall - 1]
}

describe('AdminSchedulePage', () => {
  describe('week view', () => {
    it('shows each hall’s showtimes by day, in order', async () => {
      api()
      open()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      await screen.findByRole('table')
      expect(within(grid()).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Day', 'Hall 1', 'Hall 2'])
      expect(within(grid()).getAllByRole('rowheader')[0]).toHaveTextContent('Today')

      const tomorrow = formatDay(addDays(today(), 1))
      expect(cell(tomorrow, 1)).toHaveTextContent('18:00Upto 19:36, $12.00, 4 left')
      expect(cell(tomorrow, 2).textContent).toMatch(/^14:00Inception.*20:00Inception/)
      expect(screen.getByText(/in the cinema’s timezone \(UTC\)/)).toBeInTheDocument()
    })

    it('pages through weeks, never before this one', async () => {
      api()
      const view = open()
      await screen.findByRole('table')
      const previous = screen.getByRole('button', { name: 'Previous week' })
      expect(previous).toBeDisabled()
      expect(screen.getByText(`${formatDay(today())} to ${formatDay(addDays(today(), 6))}`)).toBeInTheDocument()

      await view.user.click(screen.getByRole('button', { name: 'Next week' }))
      expect(await screen.findByText(`${formatDay(addDays(today(), 7))} to ${formatDay(addDays(today(), 13))}`)).toBeInTheDocument()
      expect(cell(formatDay(addDays(today(), 10)), 1)).toHaveTextContent('12:00Up')
      expect(previous).toBeEnabled()

      await view.user.click(previous)
      expect(screen.getByText(`${formatDay(today())} to ${formatDay(addDays(today(), 6))}`)).toBeInTheDocument()
    })

    it('says when nothing is scheduled', async () => {
      api({ 'GET /movies/showtimes': listings([]) })
      open()
      expect(
        await screen.findByText('Nothing scheduled in the next two weeks. Schedule a showtime below.'),
      ).toBeInTheDocument()
    })

    it('shows the first error for the week', async () => {
      api({ 'GET /movies/showtimes': fail(500, 'INTERNAL_ERROR', { requestId: 'req_7' }) })
      open()
      expect(await screen.findByText(/Reference: req_7/)).toBeInTheDocument()
    })
  })

  describe('deleting a showtime', () => {
    const tomorrowCell = async () => {
      await screen.findByRole('table')
      return cell(formatDay(addDays(today(), 1)), 1)
    }

    it('asks first, and can be called off', async () => {
      const server = api()
      const view = open()
      const slot = await tomorrowCell()
      await view.user.click(within(slot).getByRole('button', { name: 'Delete Up at 18:00' }))
      await view.user.click(within(slot).getByRole('button', { name: 'Keep it' }))
      expect(within(slot).getByRole('button', { name: 'Delete Up at 18:00' })).toBeInTheDocument()
      expect(server.matching('DELETE', '/showtimes/22')).toHaveLength(0)
    })

    it('deletes and confirms', async () => {
      const server = api({ 'DELETE /showtimes/{id}': () => new Response(null, { status: 204 }) })
      const view = open()
      const slot = await tomorrowCell()
      await view.user.click(within(slot).getByRole('button', { name: 'Delete Up at 18:00' }))
      await view.user.click(within(slot).getByRole('button', { name: 'Yes, delete' }))
      expect(await screen.findByText('Deleted Up at 18:00.')).toBeInTheDocument()
      expect(server.matching('DELETE', '/showtimes/22')).toHaveLength(1)
    })

    it('explains why it can’t be deleted', async () => {
      api({ 'DELETE /showtimes/{id}': fail(409, 'SHOWTIME_HAS_RESERVATIONS') })
      const view = open()
      const slot = await tomorrowCell()
      await view.user.click(within(slot).getByRole('button', { name: 'Delete Up at 18:00' }))
      await view.user.click(within(slot).getByRole('button', { name: 'Yes, delete' }))
      expect(await screen.findByText(/This showtime has bookings/)).toBeInTheDocument()
    })

    it('can’t be clicked twice', async () => {
      api({ 'DELETE /showtimes/{id}': hang })
      const view = open()
      const slot = await tomorrowCell()
      await view.user.click(within(slot).getByRole('button', { name: 'Delete Up at 18:00' }))
      await view.user.click(within(slot).getByRole('button', { name: 'Yes, delete' }))
      expect(within(slot).getByRole('button', { name: 'Yes, delete' })).toBeDisabled()
    })
  })

  describe('scheduling', () => {
    const form = () => screen.getByRole('region', { name: 'Schedule a showtime' })

    it('schedules with the cinema’s offset and the price in cents', async () => {
      const tomorrow = addDays(today(), 1)
      const server = api({
        'POST /showtimes': { ...showtime({ id: 40, startsAt: `${tomorrow}T19:00:00.000Z` }), movie: up },
      })
      const view = open()
      await screen.findByRole('table')
      await view.user.selectOptions(within(form()).getByLabelText('Movie'), 'Up')
      await view.user.selectOptions(within(form()).getByLabelText('Hall'), 'Hall 2')
      const price = within(form()).getByLabelText('Price per seat (USD)')
      await view.user.clear(price)
      await view.user.type(price, '9.99')
      await view.user.click(screen.getByRole('button', { name: 'Schedule showtime' }))

      expect(
        await screen.findByText(`Scheduled Up on ${formatDayOf(`${tomorrow}T19:00:00Z`, 'UTC')} at 19:00 in Hall 2.`),
      ).toBeInTheDocument()
      expect(await server.body('POST', '/showtimes')).toEqual({
        movieId: 2,
        hallId: 2,
        startsAt: `${tomorrow}T19:00:00+00:00`,
        priceCents: 999,
      })
    })

    it('asks for a hall number when no halls are known', async () => {
      const server = api({
        'GET /movies/showtimes': listings([]),
        'POST /showtimes': { ...showtime({ startsAt: at(1, '19:00') }), movie: movie() },
      })
      const view = open()
      const hall = await within(form()).findByLabelText('Hall number')
      expect(hall).toHaveAccessibleDescription(/enter the hall’s id/)
      await view.user.type(hall, '3')
      await view.user.click(await screen.findByRole('button', { name: 'Schedule showtime' }))
      expect(await screen.findByText(/^Scheduled Inception on .* in hall 3\.$/)).toBeInTheDocument()
      expect((await server.body('POST', '/showtimes')).hallId).toBe(3)
    })

    it('needs a day and a time', async () => {
      const server = api()
      const view = open()
      await screen.findByRole('table')
      fireEvent.change(within(form()).getByLabelText('Day'), { target: { value: '' } })
      await view.user.click(screen.getByRole('button', { name: 'Schedule showtime' }))
      expect(within(form()).getByLabelText('Starts at')).toHaveAccessibleDescription('Pick a day and a start time.')
      expect(server.matching('POST', '/showtimes')).toHaveLength(0)

      fireEvent.change(within(form()).getByLabelText('Day'), { target: { value: addDays(today(), 2) } })
      fireEvent.change(within(form()).getByLabelText('Starts at'), { target: { value: '' } })
      await view.user.click(screen.getByRole('button', { name: 'Schedule showtime' }))
      expect(server.matching('POST', '/showtimes')).toHaveLength(0)
    })

    it('puts a busy hall on the time', async () => {
      api({ 'POST /showtimes': fail(409, 'HALL_BUSY') })
      const view = open()
      await screen.findByRole('table')
      await view.user.click(screen.getByRole('button', { name: 'Schedule showtime' }))
      expect(await within(form()).findByText('The hall is busy at that time. Pick another time or hall.')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('puts validation errors on their fields', async () => {
      api({ 'POST /showtimes': fail(400, 'VALIDATION_ERROR', { details: [{ path: 'body.priceCents', message: 'Too much' }] }) })
      const view = open()
      await screen.findByRole('table')
      await view.user.click(screen.getByRole('button', { name: 'Schedule showtime' }))
      expect(await within(form()).findByText('Too much')).toBeInTheDocument()
      expect(within(form()).getByLabelText('Movie')).toHaveAttribute('aria-invalid', 'false')
    })

    it('shows other errors for the whole form', async () => {
      api({ 'POST /showtimes': fail(403, 'FORBIDDEN') })
      const view = open()
      await screen.findByRole('table')
      await view.user.click(screen.getByRole('button', { name: 'Schedule showtime' }))
      expect(await within(form()).findByRole('alert')).toHaveTextContent('You don’t have access to this.')
    })

    it('shows progress while scheduling', async () => {
      api({ 'POST /showtimes': hang })
      const view = open()
      await screen.findByRole('table')
      await view.user.click(screen.getByRole('button', { name: 'Schedule showtime' }))
      expect(screen.getByRole('button', { name: 'Scheduling…' })).toBeDisabled()
    })

    it('can’t schedule without movies', async () => {
      const server = api({ 'GET /movies': page([]), 'POST /showtimes': { ...showtime(), movie: movie() } })
      open()
      await screen.findByRole('table')
      expect(screen.getByRole('button', { name: 'Schedule showtime' })).toBeDisabled()

      // Even if the form is submitted another way, the toast still reads.
      fireEvent.submit(within(form()).getByLabelText('Movie').closest('form')!)
      expect(await screen.findByText(/^Scheduled The movie on/)).toBeInTheDocument()
      expect(server.matching('POST', '/showtimes')).toHaveLength(1)
    })
  })
})
