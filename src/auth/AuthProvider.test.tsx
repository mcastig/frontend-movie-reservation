import { QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fail, hang, mockApi } from '../test/api'
import { guest } from '../test/fixtures'
import { testQueryClient } from '../test/render'

const tokens = { tokenType: 'Bearer', accessToken: 'access', expiresIn: 900, refreshToken: 'refresh-2' }

// AuthProvider restores the session once per page load, so each test gets fresh modules.
async function setup() {
  vi.resetModules()
  const [{ AuthProvider }, { useAuth }, session] = await Promise.all([
    import('./AuthProvider'),
    import('./context'),
    import('../api/session'),
  ])
  const queryClient = testQueryClient()
  const remove = vi.spyOn(queryClient, 'removeQueries')

  let auth: ReturnType<typeof useAuth>
  function Probe() {
    auth = useAuth()
    return (
      <p>
        {auth.status}
        {auth.user && `: ${auth.user.name}`}
      </p>
    )
  }

  const mount = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    )

  return { mount, session, remove, auth: () => auth }
}

describe('AuthProvider', () => {
  it('starts signed out without a refresh token', async () => {
    const server = mockApi({})
    const { mount } = await setup()
    mount()
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('signedOut')).toBeInTheDocument()
    expect(server.fetch).not.toHaveBeenCalled()
  })

  it('restores the session from the refresh token', async () => {
    localStorage.setItem('cinema.refreshToken', 'refresh-1')
    mockApi({ 'POST /auth/refresh': tokens, 'GET /me': guest })
    const { mount, session } = await setup()
    mount()
    expect(await screen.findByText('signedIn: Ana Ruiz')).toBeInTheDocument()
    expect(session.getAccessToken()).toBe('access')
  })

  it('restores only once, even when mounted twice', async () => {
    localStorage.setItem('cinema.refreshToken', 'refresh-1')
    const server = mockApi({ 'POST /auth/refresh': tokens, 'GET /me': guest })
    const { mount } = await setup()
    mount().unmount()
    mount()
    expect(await screen.findByText('signedIn: Ana Ruiz')).toBeInTheDocument()
    expect(server.matching('POST', '/auth/refresh')).toHaveLength(1)
  })

  it('is signed out when the refresh fails', async () => {
    localStorage.setItem('cinema.refreshToken', 'used')
    mockApi({ 'POST /auth/refresh': fail(401, 'INVALID_REFRESH_TOKEN') })
    const { mount } = await setup()
    mount()
    expect(await screen.findByText('signedOut')).toBeInTheDocument()
  })

  it('is signed out when loading the user fails', async () => {
    localStorage.setItem('cinema.refreshToken', 'refresh-1')
    mockApi({ 'POST /auth/refresh': tokens, 'GET /me': fail(500, 'INTERNAL_ERROR') })
    const { mount } = await setup()
    mount()
    expect(await screen.findByText('signedOut')).toBeInTheDocument()
  })

  it('signs in and loads the user', async () => {
    const server = mockApi({ 'POST /auth/login': tokens, 'GET /me': guest })
    const { mount, auth, session } = await setup()
    mount()
    await screen.findByText('signedOut')

    await act(() => auth().signIn('ana@example.com', 'secret-password'))
    expect(screen.getByText('signedIn: Ana Ruiz')).toBeInTheDocument()
    expect(await server.body('POST', '/auth/login')).toEqual({ email: 'ana@example.com', password: 'secret-password' })
    expect(session.getRefreshToken()).toBe('refresh-2')
  })

  it('passes sign-in errors to the caller', async () => {
    mockApi({ 'POST /auth/login': fail(401, 'INVALID_CREDENTIALS') })
    const { mount, auth } = await setup()
    mount()
    await screen.findByText('signedOut')
    await expect(auth().signIn('ana@example.com', 'nope')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  it('signs up, then signs in', async () => {
    const server = mockApi({ 'POST /auth/signup': guest, 'POST /auth/login': tokens, 'GET /me': guest })
    const { mount, auth } = await setup()
    mount()
    await screen.findByText('signedOut')

    const input = { name: 'Ana Ruiz', email: 'ana@example.com', password: 'secret-password' }
    await act(() => auth().signUp(input))
    expect(screen.getByText('signedIn: Ana Ruiz')).toBeInTheDocument()
    expect(await server.body('POST', '/auth/signup')).toEqual(input)
  })

  it('signs out, forgets private data and revokes the refresh token', async () => {
    localStorage.setItem('cinema.refreshToken', 'refresh-1')
    const server = mockApi({ 'POST /auth/refresh': tokens, 'GET /me': guest, 'POST /auth/logout': () => new Response(null, { status: 204 }) })
    const { mount, auth, remove, session } = await setup()
    mount()
    await screen.findByText('signedIn: Ana Ruiz')

    await act(() => auth().signOut())
    expect(screen.getByText('signedOut')).toBeInTheDocument()
    expect(await server.body('POST', '/auth/logout')).toEqual({ refreshToken: 'refresh-2' })
    expect(session.getRefreshToken()).toBeNull()
    expect(remove.mock.calls.map(([f]) => f?.queryKey)).toEqual([['bookings', 'me'], ['admin']])
  })

  it('signs out even when the API can’t be reached', async () => {
    const { mount, auth } = await setup()
    localStorage.setItem('cinema.refreshToken', 'refresh-1')
    mockApi({ 'POST /auth/refresh': hang, 'POST /auth/logout': () => Promise.reject(new TypeError('offline')) })
    mount()

    await act(() => auth().signOut())
    expect(screen.getByText('signedOut')).toBeInTheDocument()
  })

  it('signs out without calling the API when there is no refresh token', async () => {
    const server = mockApi({})
    const { mount, auth } = await setup()
    mount()
    await screen.findByText('signedOut')
    await act(() => auth().signOut())
    expect(server.fetch).not.toHaveBeenCalled()
  })

  it('follows the session ending elsewhere', async () => {
    mockApi({ 'POST /auth/login': tokens, 'GET /me': guest })
    const { mount, auth, session } = await setup()
    mount()
    await screen.findByText('signedOut')
    await act(() => auth().signIn('ana@example.com', 'secret-password'))

    act(() => session.endSession())
    expect(screen.getByText('signedOut')).toBeInTheDocument()
  })

  it('ignores a restore that finishes after unmounting', async () => {
    localStorage.setItem('cinema.refreshToken', 'refresh-1')
    let finish!: () => void
    mockApi({
      'POST /auth/refresh': () => new Promise((resolve) => (finish = () => resolve(tokens))),
      'GET /me': guest,
    })
    const { mount } = await setup()
    const { unmount } = mount()
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    unmount()
    finish()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(screen.queryByText(/signed/)).toBeNull()
  })
})

describe('useAuth', () => {
  it('needs the provider', async () => {
    const { useAuth } = await import('./context')
    function Lonely() {
      useAuth()
      return null
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Lonely />)).toThrow('useAuth needs <AuthProvider>')
  })
})
