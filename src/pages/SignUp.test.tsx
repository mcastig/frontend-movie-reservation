import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/errors'
import { guest } from '../test/fixtures'
import { fakeAuth, locationOf, renderPage, signedInAs, stateOf } from '../test/render'
import { SignUpPage } from './SignUp'

const from = { pathname: '/showtimes/3', search: '?seats=1' }

async function fill(view: ReturnType<typeof renderPage>) {
  await view.user.type(screen.getByLabelText('Name'), '  Ana Ruiz ')
  await view.user.type(screen.getByLabelText('Email'), ' ana@example.com ')
  await view.user.type(screen.getByLabelText('Password'), 'secret-password')
  await view.user.click(screen.getByRole('button', { name: 'Create account' }))
}

const rejecting = (error: unknown) => fakeAuth({ signUp: vi.fn().mockRejectedValue(error) })

describe('SignUpPage', () => {
  it('creates the account with trimmed details, then goes back', async () => {
    const auth = fakeAuth()
    const view = renderPage(<SignUpPage />, { path: '/signup', state: { from }, auth })
    expect(document.title).toBe('Create an account')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.')
    await fill(view)
    expect(auth.signUp).toHaveBeenCalledWith({ name: 'Ana Ruiz', email: 'ana@example.com', password: 'secret-password' })
    expect(locationOf(view)).toBe('/showtimes/3?seats=1')
  })

  it('shows progress while creating the account', async () => {
    const view = renderPage(<SignUpPage />, { path: '/signup', auth: fakeAuth({ signUp: () => new Promise(() => {}) }) })
    await fill(view)
    expect(screen.getByRole('button', { name: 'Creating your account…' })).toBeDisabled()
    expect(screen.getByText('Creating your account…')).toHaveClass('visually-hidden')
  })

  it('skips the form when already signed in', () => {
    const view = renderPage(<SignUpPage />, { path: '/signup', auth: signedInAs(guest) })
    expect(locationOf(view)).toBe('/')
  })

  it('explains why when sent here to book, and keeps that on the way to sign-in', async () => {
    const view = renderPage(<SignUpPage />, { path: '/signup', state: { from, reason: 'book' } })
    expect(screen.getByText(/You need an account to book seats/)).toBeInTheDocument()
    await view.user.click(screen.getByRole('link', { name: 'Sign in' }))
    expect(locationOf(view)).toBe('/signin')
    expect(stateOf(view)).toEqual({ from, reason: 'book' })
  })

  it('puts a taken email on the email field', async () => {
    const view = renderPage(<SignUpPage />, {
      path: '/signup',
      auth: rejecting(new ApiError({ status: 409, code: 'EMAIL_TAKEN', message: '' })),
    })
    await fill(view)
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'There’s already an account with this email. Sign in instead.',
    )
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('puts validation errors on their fields', async () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: '',
      details: [{ path: 'body.password', message: 'Too short' }],
    })
    const view = renderPage(<SignUpPage />, { path: '/signup', auth: rejecting(error) })
    await fill(view)
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Too short At least 8 characters.')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows other errors for the whole form', async () => {
    const error = new ApiError({ status: 429, code: 'TOO_MANY_REQUESTS', message: '' })
    const view = renderPage(<SignUpPage />, { path: '/signup', auth: rejecting(error) })
    await fill(view)
    expect(screen.getByRole('alert')).toHaveTextContent('Too many attempts.')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows network errors', async () => {
    const view = renderPage(<SignUpPage />, { path: '/signup', auth: rejecting(new TypeError('offline')) })
    await fill(view)
    expect(screen.getByRole('alert')).toHaveTextContent('The box office can’t be reached.')
  })
})
