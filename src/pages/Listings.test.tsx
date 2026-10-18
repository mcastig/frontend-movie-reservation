import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays, formatDay } from '../lib/time'
import { fail, hang, mockApi, type Route } from '../test/api'
import { drama, genres, listed, listings, scifi, today } from '../test/fixtures'
import { locationOf, renderPage } from '../test/render'
import { ListingsPage } from './Listings'

const inception = listed({ id: 1, title: 'Inception', genres: [scifi] })
const amelie = listed({ id: 2, title: 'Amélie', genres: [drama] })

function api(over: Record<string, Route> = {}) {
  return mockApi({
    'GET /movies/showtimes': ({ query }: { query: URLSearchParams }) =>
      listings(query.get('date') === today() ? [inception, amelie] : [], query.get('date')!),
    'GET /genres': genres,
    ...over,
  })
}

const titles = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

describe('ListingsPage', () => {
  it('lists today’s movies', async () => {
    api()
    renderPage(<ListingsPage />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Inception' })).toBeInTheDocument()
    expect(titles()).toEqual(['Inception', 'Amélie'])
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What’s on today')
    expect(document.title).toBe('What’s on today, The Lantern')
  })

  it('shows a week of days, linking today to the plain URL', async () => {
    api()
    renderPage(<ListingsPage />, { path: '/?genre=2' })
    const links = within(await screen.findByRole('navigation', { name: 'Day' })).getAllByRole('link')
    expect(links).toHaveLength(7)
    expect(links[0]).toHaveAttribute('href', '/?genre=2')
    expect(links[1]).toHaveAttribute('href', `/?genre=2&date=${addDays(today(), 1)}`)
  })

  it('links days without other filters', async () => {
    api()
    renderPage(<ListingsPage />)
    const links = within(await screen.findByRole('navigation', { name: 'Day' })).getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/')
  })

  it('shows another day from the URL', async () => {
    const tomorrow = addDays(today(), 1)
    api()
    renderPage(<ListingsPage />, { path: `/?date=${tomorrow}` })
    expect(await screen.findByText(`Nothing showing on ${formatDay(tomorrow)}. Try another day.`)).toBeInTheDocument()
    expect(document.title).toBe(`What’s on ${formatDay(tomorrow)}, The Lantern`)
  })

  it('ignores days outside the week', async () => {
    api()
    renderPage(<ListingsPage />, { path: '/?date=1999-01-01' })
    expect(await screen.findByRole('heading', { name: 'Inception' })).toBeInTheDocument()
  })

  it('filters by genre, and clears the filter', async () => {
    api()
    const view = renderPage(<ListingsPage />)
    await screen.findByRole('heading', { name: 'Inception' })
    await view.user.click(screen.getByRole('button', { name: 'Drama' }))
    expect(locationOf(view)).toBe('/?genre=1')
    expect(titles()).toEqual(['Amélie'])

    await view.user.click(screen.getByRole('button', { name: 'Drama' }))
    expect(locationOf(view)).toBe('/')
    expect(titles()).toEqual(['Inception', 'Amélie'])
  })

  it('offers every genre when a genre has nothing showing', async () => {
    api({ 'GET /movies/showtimes': listings([inception]) })
    const view = renderPage(<ListingsPage />, { path: '/?genre=1' })
    expect(
      await screen.findByText(`No Drama showing on ${formatDay(today())}. Try another day or genre.`),
    ).toBeInTheDocument()
    await view.user.click(screen.getByRole('button', { name: 'Show every genre' }))
    expect(titles()).toEqual(['Inception'])
  })

  it('treats an unknown genre as nothing showing', async () => {
    api({ 'GET /genres': [] })
    renderPage(<ListingsPage />, { path: '/?genre=99' })
    expect(await screen.findByText(/^Nothing showing on/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Filter by genre' })).toBeNull()
  })

  it('shows errors with a retry', async () => {
    api({ 'GET /movies/showtimes': fail(500, 'INTERNAL_ERROR', { requestId: 'req_1' }) })
    const view = renderPage(<ListingsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Reference: req_1')

    api({ 'GET /movies/showtimes': listings([inception]) })
    await view.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Inception' })).toBeInTheDocument()
  })

  it('keeps the filters while genres load', async () => {
    api({ 'GET /genres': hang })
    renderPage(<ListingsPage />)
    expect(await screen.findByRole('heading', { name: 'Inception' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Filter by genre' })).toBeNull()
  })
})
