import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, guest } from '../test/fixtures'
import { fakeAuth, locationOf, renderPage, signedInAs, stateOf } from '../test/render'
import { RequireAdmin, RequireAuth } from './guards'
import { returnPath } from './returnPath'

describe('RequireAuth', () => {
  it('waits while the session is restored', () => {
    renderPage(<RequireAuth>Secret</RequireAuth>, { auth: fakeAuth({ status: 'loading' }) })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('sends signed-out visitors to sign in, remembering where they were', () => {
    const view = renderPage(<RequireAuth>Secret</RequireAuth>, { path: '/bookings?booked=4' })
    expect(locationOf(view)).toBe('/signin')
    expect(stateOf(view)).toMatchObject({ from: { pathname: '/bookings', search: '?booked=4' } })
  })

  it('shows the page when signed in', () => {
    renderPage(<RequireAuth>Secret</RequireAuth>, { auth: signedInAs(guest) })
    expect(screen.getByText('Secret')).toBeInTheDocument()
  })
})

describe('RequireAdmin', () => {
  it('shows the back office to admins', () => {
    renderPage(<RequireAdmin>Back office</RequireAdmin>, { auth: signedInAs(admin) })
    expect(screen.getByText('Back office')).toBeInTheDocument()
  })

  it('tells everyone else they don’t have access', () => {
    renderPage(<RequireAdmin>Back office</RequireAdmin>, { auth: signedInAs(guest) })
    expect(screen.queryByText('Back office')).toBeNull()
    expect(screen.getByText('You don’t have access to this.')).toBeInTheDocument()
  })

  it('needs a session first', () => {
    const view = renderPage(<RequireAdmin>Back office</RequireAdmin>, { path: '/admin' })
    expect(locationOf(view)).toBe('/signin')
  })
})

describe('returnPath', () => {
  it('goes back to where the visitor came from, or home', () => {
    expect(returnPath(null)).toBe('/')
    expect(returnPath({ reason: 'book' })).toBe('/')
    expect(returnPath({ from: { pathname: '/showtimes/3', search: '?seats=1,2' } })).toBe('/showtimes/3?seats=1,2')
    expect(returnPath({ from: { pathname: '/bookings' } as { pathname: string; search: string } })).toBe('/bookings')
  })
})
