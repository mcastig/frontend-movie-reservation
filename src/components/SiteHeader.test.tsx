import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, guest } from '../test/fixtures'
import { fakeAuth, locationOf, renderPage, signedInAs, stateOf } from '../test/render'
import { LobbyLayout, Root, SkipLink } from './Layouts'
import { SiteHeader } from './SiteHeader'

describe('SiteHeader', () => {
  it('links home under the cinema’s name', () => {
    renderPage(<SiteHeader />)
    expect(screen.getByRole('link', { name: 'The Lantern' })).toHaveAttribute('href', '/')
  })

  it('shows nothing in the account menu while loading', () => {
    renderPage(<SiteHeader />, { auth: fakeAuth({ status: 'loading' }) })
    expect(screen.getByRole('navigation', { name: 'Account' })).toBeEmptyDOMElement()
  })

  it('offers sign-in that comes back to the current page', async () => {
    const view = renderPage(<SiteHeader />, { path: '/movies/3' , route: '/movies/:id' })
    await view.user.click(screen.getByRole('link', { name: 'Sign in' }))
    expect(locationOf(view)).toBe('/signin')
    expect(stateOf(view)).toMatchObject({ from: { pathname: '/movies/3' } })
  })

  it('shows bookings and sign-out when signed in', () => {
    renderPage(<SiteHeader />, { auth: signedInAs(guest) })
    expect(screen.getByRole('link', { name: 'My bookings' })).toHaveAttribute('href', '/bookings')
    expect(screen.queryByRole('link', { name: 'Back office' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('asks before signing out', async () => {
    const auth = signedInAs(guest)
    const view = renderPage(<SiteHeader />, { auth })
    expect(screen.queryByRole('dialog')).toBeNull()

    await view.user.click(screen.getByRole('button', { name: 'Sign out' }))
    const dialog = screen.getByRole('dialog', { name: 'Sign out?' })
    expect(dialog).toHaveAccessibleDescription('You’ll need to sign in again to book seats or see your bookings.')
    expect(within(dialog).getByRole('button', { name: 'Stay signed in' })).toHaveFocus()

    await view.user.click(within(dialog).getByRole('button', { name: 'Stay signed in' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(auth.signOut).not.toHaveBeenCalled()

    await view.user.click(screen.getByRole('button', { name: 'Sign out' }))
    await view.user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sign out' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('links admins to the back office, full width when asked', () => {
    renderPage(<SiteHeader wide />, { auth: signedInAs(admin) })
    expect(screen.getByRole('link', { name: 'Back office' })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('banner').firstElementChild).toHaveStyle({ maxWidth: 'none' })
  })
})

describe('Layouts', () => {
  it('puts lobby pages under the header, after a skip link', () => {
    renderPage(<LobbyLayout />, { children: [{ index: true, element: <p>Listings</p> }] })
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Listings')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('renders the root outlet and a standalone skip link', () => {
    renderPage(<Root />, { children: [{ index: true, element: <SkipLink /> }] })
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument()
  })
})
