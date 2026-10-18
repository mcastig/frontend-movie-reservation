import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { guest } from '../test/fixtures'
import { fakeAuth, locationOf, renderPage, signedInAs, stateOf } from '../test/render'
import { SignInPage } from './SignIn'

const from = { pathname: '/showtimes/3', search: '?seats=1,2' }

async function fill(view: ReturnType<typeof renderPage>) {
  await view.user.type(screen.getByLabelText('Email'), 'ana@example.com')
  await view.user.type(screen.getByLabelText('Password'), 'secret-password')
  await view.user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInPage', () => {
  it('signs in and goes back where the visitor came from', async () => {
    const auth = fakeAuth()
    const view = renderPage(<SignInPage />, { path: '/signin', state: { from }, auth })
    expect(document.title).toBe('Sign in')
    await fill(view)
    expect(auth.signIn).toHaveBeenCalledWith('ana@example.com', 'secret-password')
    expect(locationOf(view)).toBe('/showtimes/3?seats=1,2')
  })

  it('goes home by default', async () => {
    const view = renderPage(<SignInPage />, { path: '/signin' })
    await fill(view)
    expect(locationOf(view)).toBe('/')
  })

  it('shows progress while signing in', async () => {
    const view = renderPage(<SignInPage />, { path: '/signin', auth: fakeAuth({ signIn: () => new Promise(() => {}) }) })
    await fill(view)
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled()
  })

  it('skips the form when already signed in', () => {
    const view = renderPage(<SignInPage />, { path: '/signin', state: { from }, auth: signedInAs(guest) })
    expect(locationOf(view)).toBe('/showtimes/3?seats=1,2')
  })

  it('explains why when sent here to book, and keeps that on the way to sign-up', async () => {
    const view = renderPage(<SignInPage />, { path: '/signin', state: { from, reason: 'book' } })
    expect(screen.getByText(/Sign in to book your seats/)).toBeInTheDocument()
    await view.user.click(screen.getByRole('link', { name: 'Create an account' }))
    expect(locationOf(view)).toBe('/signup')
    expect(stateOf(view)).toEqual({ from, reason: 'book' })
  })

  it('shows a form-level error', async () => {
    const signIn = vi.fn().mockRejectedValue(new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: '' }))
    const view = renderPage(<SignInPage />, { path: '/signin', auth: fakeAuth({ signIn }) })
    await fill(view)
    expect(screen.getByRole('alert')).toHaveTextContent('Email or password is incorrect.')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
  })

  it('shows network errors', async () => {
    const view = renderPage(<SignInPage />, {
      path: '/signin',
      auth: fakeAuth({ signIn: vi.fn().mockRejectedValue(new TypeError('offline')) }),
    })
    await fill(view)
    expect(screen.getByRole('alert')).toHaveTextContent('The box office can’t be reached.')
  })

  it('puts validation errors on their fields', async () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '',
      details: [{ path: 'body.email', message: 'Enter a valid email' }],
    })
    const view = renderPage(<SignInPage />, { path: '/signin', auth: fakeAuth({ signIn: vi.fn().mockRejectedValue(error) }) })
    await fill(view)
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Enter a valid email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
