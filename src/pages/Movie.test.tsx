import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays, formatDay } from '../lib/time'
import { fail, hang, mockApi } from '../test/api'
import { at, hall2, listed, listings, movie, showtime, today } from '../test/fixtures'
import { renderPage } from '../test/render'
import { MoviePage } from './Movie'

const tomorrow = () => addDays(today(), 1)

// Inception plays today and in three days; another movie plays tomorrow.
function schedule({ query }: { query: URLSearchParams }) {
  const date = query.get('date')!
  if (date === today()) return listings([listed({}, [showtime({ id: 1, startsAt: at(0, '23:00') })])], date)
  if (date === addDays(today(), 3))
    return listings([listed({}, [showtime({ id: 2, startsAt: at(3, '18:00'), hall: hall2 })])], date)
  if (date === tomorrow()) return listings([listed({ id: 9, title: 'Up' })], date)
  return listings([], date)
}

describe('MoviePage', () => {
  it('shows the movie and its showtimes this week', async () => {
    const server = mockApi({ 'GET /movies/{id}': movie(), 'GET /movies/showtimes': schedule })
    renderPage(<MoviePage />, { path: '/movies/1', route: '/movies/:id' })
    expect(screen.getByText('Loading…')).toBeInTheDocument()

    expect(await screen.findByRole('heading', { level: 1, name: 'Inception' })).toBeInTheDocument()
    expect(screen.getByText('2 h 28 min, Sci-Fi')).toBeInTheDocument()
    expect(screen.getByText('A thief who steals secrets through dreams.')).toBeInTheDocument()
    expect(document.title).toBe('Inception, The Lantern')

    const days = await screen.findAllByRole('listitem')
    const section = screen.getByRole('region', { name: 'Showtimes this week' })
    expect(within(section).getByText('Today')).toBeInTheDocument()
    expect(within(section).getByText(formatDay(addDays(today(), 3)))).toBeInTheDocument()
    expect(within(section).getByRole('link', { name: 'Today, 23:00, Hall 1, 38 left' })).toBeInTheDocument()
    expect(within(section).getByText('Hall 2')).toBeInTheDocument()
    expect(days.length).toBeGreaterThan(0)
    expect(server.matching('GET', '/movies/showtimes')).toHaveLength(7)
  })

  it('says when there’s nothing this week', async () => {
    mockApi({ 'GET /movies/{id}': movie({ id: 9, title: 'Up' }), 'GET /movies/showtimes': listings([]) })
    renderPage(<MoviePage />, { path: '/movies/9', route: '/movies/:id' })
    expect(await screen.findByText('No showtimes in the next 7 days.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See what’s on today' })).toHaveAttribute('href', '/')
  })

  it('waits for the schedule', async () => {
    mockApi({ 'GET /movies/{id}': movie(), 'GET /movies/showtimes': hang })
    renderPage(<MoviePage />, { path: '/movies/1', route: '/movies/:id' })
    expect(await screen.findByText('Loading showtimes…')).toBeInTheDocument()
  })

  it('shows the not-found page for a missing movie', async () => {
    mockApi({ 'GET /movies/{id}': fail(404, 'NOT_FOUND'), 'GET /movies/showtimes': listings([]) })
    renderPage(<MoviePage />, { path: '/movies/404', route: '/movies/:id' })
    expect(await screen.findByRole('heading', { name: 'This page isn’t showing' })).toBeInTheDocument()
    expect(document.title).toBe('Not found')
  })

  it('shows other errors with a retry', async () => {
    mockApi({ 'GET /movies/{id}': fail(500, 'INTERNAL_ERROR'), 'GET /movies/showtimes': listings([]) })
    const view = renderPage(<MoviePage />, { path: '/movies/1', route: '/movies/:id' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on our side.')

    mockApi({ 'GET /movies/{id}': movie(), 'GET /movies/showtimes': listings([]) })
    await view.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Inception' })).toBeInTheDocument()
  })
})
