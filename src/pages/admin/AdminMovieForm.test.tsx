import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fail, hang, mockApi, type Route } from '../../test/api'
import { drama, genres, movie, scifi } from '../../test/fixtures'
import { locationOf, renderPage } from '../../test/render'
import { AdminMovieFormPage } from './AdminMovieForm'

const inception = movie({ id: 1, genres: [scifi] })
const horror = { id: 3, name: 'Horror' }

function api(over: Record<string, Route> = {}) {
  return mockApi({ 'GET /genres': genres, 'GET /movies/{id}': inception, ...over })
}

const add = () => renderPage(<AdminMovieFormPage />, { path: '/admin/movies/new' })
const edit = (id = 1) => renderPage(<AdminMovieFormPage />, { path: `/admin/movies/${id}`, route: '/admin/movies/:id' })

async function fillNew(view: ReturnType<typeof renderPage>) {
  await view.user.type(screen.getByLabelText('Title'), ' Up ')
  await view.user.type(screen.getByLabelText('Description'), 'Balloons.')
  await view.user.type(screen.getByLabelText('Length in minutes'), '96')
  await view.user.click(await screen.findByRole('checkbox', { name: 'Drama' }))
}

describe('AdminMovieFormPage', () => {
  describe('adding', () => {
    it('adds a movie and goes back to the list', async () => {
      const server = api({ 'POST /movies': movie({ id: 2, title: 'Up' }) })
      const view = add()
      expect(screen.getByRole('heading', { name: 'Add a movie' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '← Movies' })).toHaveAttribute('href', '/admin/movies')
      await fillNew(view)
      await view.user.click(screen.getByRole('button', { name: 'Add movie' }))

      expect(await screen.findByText('Up saved.')).toBeInTheDocument()
      expect(locationOf(view)).toBe('/admin/movies')
      expect(await server.body('POST', '/movies')).toEqual({
        title: 'Up',
        description: 'Balloons.',
        posterUrl: null,
        durationMinutes: 96,
        genreIds: [1],
      })
    })

    it('unticks a genre', async () => {
      const server = api({ 'POST /movies': movie({ title: 'Up' }) })
      const view = add()
      await fillNew(view)
      await view.user.click(screen.getByRole('checkbox', { name: 'Sci-Fi' }))
      await view.user.click(screen.getByRole('checkbox', { name: 'Drama' }))
      await view.user.click(screen.getByRole('button', { name: 'Add movie' }))
      await screen.findByText('Up saved.')
      expect((await server.body('POST', '/movies')).genreIds).toEqual([2])
    })

    it('shows progress while saving', async () => {
      api({ 'POST /movies': hang })
      const view = add()
      await fillNew(view)
      await view.user.click(screen.getByRole('button', { name: 'Add movie' }))
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    })

    it('puts validation errors on their fields', async () => {
      api({
        'POST /movies': fail(400, 'VALIDATION_ERROR', {
          details: [
            { path: 'body.title', message: 'Title is required' },
            { path: 'body.genreIds', message: 'Pick at most 5 genres' },
          ],
        }),
      })
      const view = add()
      await view.user.click(screen.getByRole('button', { name: 'Add movie' }))
      expect(await screen.findByText('Pick at most 5 genres')).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveAccessibleDescription('Title is required')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('shows other errors for the whole form', async () => {
      api({ 'POST /movies': fail(400, 'BAD_REQUEST') })
      const view = add()
      await fillNew(view)
      await view.user.click(screen.getByRole('button', { name: 'Add movie' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('That’s too much text to save.')
    })
  })

  describe('new genres', () => {
    it('adds a genre and ticks it, from the button or Enter', async () => {
      let created = false
      const server = api({
        'GET /genres': () => (created ? [...genres, horror] : genres),
        'POST /genres': () => ((created = true), horror),
      })
      const view = add()
      const input = screen.getByLabelText('New genre')
      const button = screen.getByRole('button', { name: 'Add genre' })
      expect(button).toBeDisabled()

      await view.user.type(input, '   ')
      expect(button).toBeDisabled()
      await view.user.keyboard('{Enter}')
      expect(server.matching('POST', '/genres')).toHaveLength(0)

      await view.user.clear(input)
      await view.user.type(input, ' Horror ')
      await view.user.click(button)
      expect(await server.body('POST', '/genres')).toEqual({ name: 'Horror' })
      expect(await screen.findByRole('checkbox', { name: 'Horror' })).toBeChecked()
      expect(input).toHaveValue('')

      await view.user.type(input, 'Noir{Enter}')
      expect(server.matching('POST', '/genres')).toHaveLength(2)
      // Other keys just type.
      expect(server.matching('POST', '/movies')).toHaveLength(0)
    })

    it('explains a genre that already exists', async () => {
      api({ 'POST /genres': fail(409, 'GENRE_EXISTS') })
      const view = add()
      await view.user.type(screen.getByLabelText('New genre'), 'Drama')
      await view.user.click(screen.getByRole('button', { name: 'Add genre' }))
      expect(await screen.findByText('That genre already exists.')).toBeInTheDocument()
    })
  })

  describe('editing', () => {
    it('loads the movie into the form', async () => {
      api()
      edit()
      expect(screen.getByText('Loading…')).toBeInTheDocument()
      expect(await screen.findByRole('heading', { name: 'Edit Inception' })).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveValue('Inception')
      expect(screen.getByLabelText('Poster URL')).toHaveValue('https://example.com/inception.jpg')
      expect(await screen.findByRole('checkbox', { name: 'Sci-Fi' })).toBeChecked()
    })

    it('sends only what changed', async () => {
      const server = api({ 'PATCH /movies/{id}': movie({ title: 'Inception (2010)' }) })
      const view = edit()
      const title = await screen.findByLabelText('Title')
      await view.user.clear(title)
      await view.user.type(title, 'Inception (2010)')
      await view.user.clear(screen.getByLabelText('Description'))
      await view.user.type(screen.getByLabelText('Description'), 'Dreams.')
      await view.user.clear(screen.getByLabelText('Poster URL'))
      await view.user.clear(screen.getByLabelText('Length in minutes'))
      await view.user.type(screen.getByLabelText('Length in minutes'), '150')
      await view.user.click(await screen.findByRole('checkbox', { name: 'Drama' }))
      await view.user.click(screen.getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText('Inception (2010) saved.')).toBeInTheDocument()
      expect(await server.body('PATCH', '/movies/1')).toEqual({
        title: 'Inception (2010)',
        description: 'Dreams.',
        posterUrl: null,
        durationMinutes: 150,
        genreIds: [2, 1],
      })
    })

    it('sends one changed field', async () => {
      const server = api({ 'PATCH /movies/{id}': movie() })
      const view = edit()
      await view.user.type(await screen.findByLabelText('Description'), '!')
      await view.user.click(screen.getByRole('button', { name: 'Save changes' }))
      await screen.findByText('Inception saved.')
      expect(await server.body('PATCH', '/movies/1')).toEqual({ description: `${inception.description}!` })
    })

    it('just goes back when nothing changed', async () => {
      const server = api()
      const view = edit()
      await view.user.click(await screen.findByRole('button', { name: 'Save changes' }))
      expect(locationOf(view)).toBe('/admin/movies')
      expect(server.matching('PATCH', '/movies/1')).toHaveLength(0)
    })

    it('keeps an empty poster empty', async () => {
      const server = api({ 'GET /movies/{id}': movie({ posterUrl: null, genres: [drama] }) })
      const view = edit()
      expect(await screen.findByLabelText('Poster URL')).toHaveValue('')
      await view.user.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(server.matching('PATCH', '/movies/1')).toHaveLength(0)
    })

    it('shows errors loading the movie, with a retry', async () => {
      api({ 'GET /movies/{id}': fail(404, 'NOT_FOUND') })
      const view = edit(9)
      expect(await screen.findByRole('alert')).toHaveTextContent('That page doesn’t exist')
      api()
      await view.user.click(screen.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByRole('heading', { name: 'Edit Inception' })).toBeInTheDocument()
    })

    it('shows errors saving', async () => {
      api({ 'PATCH /movies/{id}': fail(403, 'FORBIDDEN') })
      const view = edit()
      await view.user.type(await screen.findByLabelText('Title'), '!')
      await view.user.click(screen.getByRole('button', { name: 'Save changes' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('You don’t have access to this.')
    })
  })

  it('shows the form before genres load', () => {
    api({ 'GET /genres': hang })
    add()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})
