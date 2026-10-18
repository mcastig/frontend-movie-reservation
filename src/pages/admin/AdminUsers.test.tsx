import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fail, hang, mockApi, type Route } from '../../test/api'
import { admin, adminReservation, page } from '../../test/fixtures'
import { renderPage, signedInAs } from '../../test/render'
import { AdminUsersPage } from './AdminUsers'

const ana = { id: 7, name: 'Ana Ruiz', email: 'ana@example.com' }
const leo = { id: 8, name: 'Leo Park', email: 'leo@cinema.org' }

function api(over: Record<string, Route> = {}) {
  return mockApi({
    'GET /admin/reservations': page([
      adminReservation({ id: 1, user: ana }),
      adminReservation({ id: 2, user: leo }),
      adminReservation({ id: 3, user: ana }),
      adminReservation({ id: 4, user: { id: admin.id, name: admin.name, email: admin.email } }),
    ]),
    ...over,
  })
}

const open = () => renderPage(<AdminUsersPage />, { path: '/admin/users', auth: signedInAs(admin) })
const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const rowFor = (name: string) => screen.getByRole('cell', { name }).closest('tr')!

describe('AdminUsersPage', () => {
  it('lists everyone who has booked, once each, and marks me', async () => {
    const server = api()
    open()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await screen.findByRole('table')
    expect(bodyRows().map((r) => r.firstChild!.textContent)).toEqual(['7', '8', '1'])
    expect(within(rowFor('Box Office')).getByText('You')).toBeInTheDocument()
    expect(within(rowFor('Box Office')).queryByRole('button')).toBeNull()
    expect(Object.fromEntries(new URL(server.requests[0].url).searchParams)).toEqual({ limit: '100', page: '1' })
  })

  it('searches by name or email', async () => {
    api()
    const view = open()
    await screen.findByRole('table')
    const search = screen.getByRole('searchbox', { name: 'Find a user' })

    await view.user.type(search, '  LEO ')
    expect(bodyRows().map((r) => r.firstChild!.textContent)).toEqual(['8'])

    await view.user.clear(search)
    await view.user.type(search, 'example.com')
    expect(bodyRows().map((r) => r.firstChild!.textContent)).toEqual(['7', '1'])

    await view.user.clear(search)
    await view.user.type(search, 'nobody')
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('No one who has booked matches. Try their user number.')
  })

  it('finds anyone by user number', async () => {
    api()
    const view = open()
    await screen.findByRole('table')
    const search = screen.getByRole('searchbox', { name: 'Find a user' })

    await view.user.type(search, '42')
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('42——')
    expect(screen.getByRole('button', { name: 'Make User 42 an admin' })).toBeInTheDocument()

    // A number that belongs to someone listed shows them, not a blank row.
    await view.user.clear(search)
    await view.user.type(search, '7')
    expect(bodyRows().map((r) => r.firstChild!.textContent)).toEqual(['7'])
    expect(bodyRows()[0]).toHaveTextContent('Ana Ruiz')

    // My own number.
    await view.user.clear(search)
    await view.user.type(search, '1')
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('You')
  })

  it('lists my own number when I haven’t booked', async () => {
    api({ 'GET /admin/reservations': page([]) })
    const view = open()
    await screen.findByRole('table')
    await view.user.type(screen.getByRole('searchbox'), '1')
    expect(bodyRows()[0]).toHaveTextContent('1——You')
  })

  it('makes someone an admin, or a regular user', async () => {
    const server = api({
      'PATCH /users/{id}/role': async ({ request }: { request: Request }) => ({ ...ana, role: (await request.json()).role }),
    })
    const view = open()
    await screen.findByRole('table')

    await view.user.click(screen.getByRole('button', { name: 'Make Ana Ruiz an admin' }))
    expect(await screen.findByText('Ana Ruiz is now an admin.')).toBeInTheDocument()
    expect(await server.body('PATCH', '/users/7/role')).toEqual({ role: 'admin' })

    await view.user.click(screen.getByRole('button', { name: 'Make Ana Ruiz a regular user' }))
    expect(await screen.findByText('Ana Ruiz is now a regular user.')).toBeInTheDocument()
  })

  it('disables the buttons while saving and explains failures', async () => {
    let answer!: (response: Response) => void
    api({ 'PATCH /users/{id}/role': () => new Promise<Response>((resolve) => (answer = resolve)) })
    const view = open()
    await screen.findByRole('table')

    await view.user.click(screen.getByRole('button', { name: 'Make Leo Park an admin' }))
    expect(screen.getByRole('button', { name: 'Make Leo Park a regular user' })).toBeDisabled()
    answer(fail(403, 'CANNOT_CHANGE_OWN_ROLE')())
    expect(await within(rowFor('Leo Park')).findByRole('alert')).toHaveTextContent('You can’t change your own role')
  })

  it('shows errors with a retry', async () => {
    api({ 'GET /admin/reservations': fail(500, 'INTERNAL_ERROR') })
    const view = open()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    api({ 'GET /admin/reservations': hang })
    await view.user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('works without knowing who I am', async () => {
    api()
    renderPage(<AdminUsersPage />, { path: '/admin/users' })
    await screen.findByRole('table')
    expect(screen.queryByText('You')).toBeNull()
  })
})
