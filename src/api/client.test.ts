import { describe, expect, it, vi } from 'vitest'
import { fail, mockApi } from '../test/api'
import { api, call, refreshSession } from './client'
import { getAccessToken, getRefreshToken, onSessionEnd, setTokens } from './session'

const me = { id: 1, email: 'a@b.c', name: 'A', role: 'user', createdAt: '' }
const expired = fail(401, 'TOKEN_EXPIRED')
const newTokens = { tokenType: 'Bearer', accessToken: 'new', expiresIn: 900, refreshToken: 'refresh-2' }

describe('refreshSession', () => {
  it('does nothing without a refresh token', async () => {
    const server = mockApi({})
    await expect(refreshSession()).resolves.toBe(false)
    expect(server.fetch).not.toHaveBeenCalled()
  })

  it('stores the new pair', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'refresh-1' })
    const server = mockApi({ 'POST /auth/refresh': newTokens })
    await expect(refreshSession()).resolves.toBe(true)
    expect(await server.body('POST', '/auth/refresh')).toEqual({ refreshToken: 'refresh-1' })
    expect(getAccessToken()).toBe('new')
    expect(getRefreshToken()).toBe('refresh-2')
  })

  it('keeps the session when the API is down', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'refresh-1' })
    mockApi({ 'POST /auth/refresh': fail(503, 'INTERNAL_ERROR') })
    await expect(refreshSession()).resolves.toBe(false)
    expect(getRefreshToken()).toBe('refresh-1')
  })

  it('ends the session when the refresh token is refused', async () => {
    const ended = vi.fn()
    const unsubscribe = onSessionEnd(ended)
    setTokens({ accessToken: 'old', refreshToken: 'bad' })
    mockApi({ 'POST /auth/refresh': fail(400, 'VALIDATION_ERROR') })
    await expect(refreshSession()).resolves.toBe(false)
    expect(getRefreshToken()).toBeNull()
    expect(ended).toHaveBeenCalled()
    unsubscribe()
  })
})

describe('authFetch', () => {
  it('sends the bearer token when there is one', async () => {
    const server = mockApi({ 'GET /me': me })
    await call(api.GET('/me'))
    expect(server.requests[0].headers.get('Authorization')).toBeNull()

    setTokens({ accessToken: 'abc', refreshToken: 'r' })
    await call(api.GET('/me'))
    expect(server.requests[1].headers.get('Authorization')).toBe('Bearer abc')
  })

  it('refreshes once when two requests hit TOKEN_EXPIRED at the same time', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'refresh-1' })
    let refreshCalls = 0
    mockApi({
      'POST /auth/refresh': async () => {
        refreshCalls += 1
        // Slow enough that the second 401 arrives while this is in flight.
        await new Promise((resolve) => setTimeout(resolve, 20))
        return newTokens
      },
      'GET /me': ({ request }) => (request.headers.get('Authorization') === 'Bearer old' ? expired() : me),
    })

    const [first, second] = await Promise.all([call(api.GET('/me')), call(api.GET('/me'))])

    expect(refreshCalls).toBe(1)
    expect(first).toMatchObject({ id: 1 })
    expect(second).toMatchObject({ id: 1 })
    expect(getAccessToken()).toBe('new')
    expect(getRefreshToken()).toBe('refresh-2')
  })

  it('retries with a token another request already refreshed', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'refresh-1' })
    const server = mockApi({
      'GET /me': ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer old') return me
        // Someone else refreshed while this request was out.
        setTokens({ accessToken: 'fresh', refreshToken: 'refresh-2' })
        return expired()
      },
    })

    await expect(call(api.GET('/me'))).resolves.toMatchObject({ id: 1 })
    expect(server.matching('POST', '/auth/refresh')).toHaveLength(0)
    expect(server.requests.at(-1)!.headers.get('Authorization')).toBe('Bearer fresh')
  })

  it('signs out when the refresh token is rejected', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'used' })
    mockApi({ 'POST /auth/refresh': fail(401, 'INVALID_REFRESH_TOKEN'), 'GET /me': expired })

    await expect(call(api.GET('/me'))).rejects.toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('ends the session when the API no longer accepts the token', async () => {
    const ended = vi.fn()
    const unsubscribe = onSessionEnd(ended)
    setTokens({ accessToken: 'revoked', refreshToken: 'r' })
    mockApi({ 'GET /me': fail(401, 'INVALID_TOKEN') })

    await expect(call(api.GET('/me'))).rejects.toMatchObject({ code: 'INVALID_TOKEN' })
    expect(ended).toHaveBeenCalled()
    unsubscribe()
  })

  it('leaves the session alone for other 401s', async () => {
    mockApi({ 'POST /auth/login': fail(401, 'INVALID_CREDENTIALS'), 'GET /me': fail(401, 'UNAUTHENTICATED') })

    // Signed out: nothing to end.
    await expect(call(api.GET('/me'))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })

    setTokens({ accessToken: 'abc', refreshToken: 'r' })
    await expect(
      call(api.POST('/auth/login', { body: { email: 'a@b.c', password: 'wrong-password' } })),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(getAccessToken()).toBe('abc')
  })
})

describe('call', () => {
  it('returns the data of a successful response', async () => {
    mockApi({ 'GET /genres': [{ id: 1, name: 'Drama' }] })
    await expect(call(api.GET('/genres'))).resolves.toEqual([{ id: 1, name: 'Drama' }])
  })

  it('turns error bodies into a typed ApiError', async () => {
    mockApi({ 'POST /reservations': fail(409, 'SEATS_TAKEN', { message: 'Seat(s) already taken: B4' }) })
    await expect(
      call(api.POST('/reservations', { body: { showtimeId: 1, seatIds: [12] } })),
    ).rejects.toMatchObject({ name: 'ApiError', status: 409, code: 'SEATS_TAKEN' })
  })

  it('handles empty successful responses', async () => {
    mockApi({ 'DELETE /movies/{id}': () => new Response(null, { status: 204 }) })
    await expect(call(api.DELETE('/movies/{id}', { params: { path: { id: 3 } } }))).resolves.toBeUndefined()
  })
})
