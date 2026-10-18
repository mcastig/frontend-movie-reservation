import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fail, hang, mockApi } from '../../test/api'
import { drama, movie, page, scifi } from '../../test/fixtures'
import { renderPage } from '../../test/render'
import { AdminLayout } from './AdminLayout'
import { AdminMoviesPage } from './AdminMovies'

const inception = movie({ id: 1, title: 'Inception', genres: [scifi, drama] })
const up = movie({ id: 2, title: 'Up', durationMinutes: 96, genres: [] })

const open = () => renderPage(<AdminMoviesPage />, { path: '/admin/movies' })
const row = (title: string) => screen.getByRole('link', { name: title }).closest('tr')!

describe('AdminLayout', () => {
  it('shows the back office tabs around the page', () => {
    renderPage(<AdminLayout />, { path: '/admin/movies', route: '/admin', children: [{ path: 'movies', element: <p>Movies page</p> }] })
    const tabs = within(screen.getByRole('navigation', { name: 'Back office' })).getAllByRole('link')
    expect(tabs.map((t) => t.textContent)).toEqual(['Movies', 'Schedule', 'Bookings', 'Reports', 'Users'])
    expect(tabs[0]).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Movies page')).toBeInTheDocument()
    expect(document.title).toBe('Back office')
  })
})

describe('AdminMoviesPage', () => {
  it('lists movies with their length and genres', async () => {
    mockApi({ 'GET /movies': page([inception, up]) })
    open()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Inception' })).toHaveAttribute('href', '/admin/movies/1')
    expect(row('Inception')).toHaveTextContent('2 h 28 minSci-Fi, Drama')
    expect(row('Up')).toHaveTextContent('1 h 36 min—')
    expect(screen.getByRole('link', { name: 'Add a movie' })).toHaveAttribute('href', '/admin/movies/new')
  })

  it('invites adding the first movie', async () => {
    mockApi({ 'GET /movies': page([]) })
    open()
    expect(await screen.findByText('No movies yet. Add the first one to start scheduling.')).toBeInTheDocument()
  })

  it('shows errors with a retry', async () => {
    mockApi({ 'GET /movies': fail(500, 'INTERNAL_ERROR') })
    const view = open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    mockApi({ 'GET /movies': page([up]) })
    await view.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('link', { name: 'Up' })).toBeInTheDocument()
  })

  it('deletes a movie after confirming', async () => {
    const server = mockApi({ 'GET /movies': page([inception, up]), 'DELETE /movies/{id}': () => new Response(null, { status: 204 }) })
    const view = open()
    await screen.findByRole('link', { name: 'Up' })

    await view.user.click(within(row('Up')).getByRole('button', { name: 'Delete' }))
    await view.user.click(within(row('Up')).getByRole('button', { name: 'Keep it' }))
    expect(server.matching('DELETE', '/movies/2')).toHaveLength(0)

    await view.user.click(within(row('Up')).getByRole('button', { name: 'Delete' }))
    await view.user.click(within(row('Up')).getByRole('button', { name: 'Yes, delete Up' }))
    expect(await screen.findByText('Up deleted.')).toBeInTheDocument()
    expect(server.matching('DELETE', '/movies/2')).toHaveLength(1)
  })

  it('explains why a movie can’t be deleted, and clears that on a new try', async () => {
    let answer!: (response: Response) => void
    mockApi({
      'GET /movies': page([inception]),
      'DELETE /movies/{id}': () => new Promise<Response>((resolve) => (answer = resolve)),
    })
    const view = open()
    await view.user.click(await screen.findByRole('button', { name: 'Delete' }))
    await view.user.click(screen.getByRole('button', { name: 'Yes, delete Inception' }))
    expect(screen.getByRole('button', { name: 'Yes, delete Inception' })).toBeDisabled()

    answer(fail(409, 'MOVIE_HAS_SHOWTIMES')())
    expect(await screen.findByRole('alert')).toHaveTextContent('This movie has showtimes')
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()

    mockApi({ 'GET /movies': page([inception]), 'DELETE /movies/{id}': hang })
    await view.user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
