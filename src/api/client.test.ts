import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, call } from './client'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './session'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const expired = () => json(401, { error: { code: 'TOKEN_EXPIRED', message: 'Token expired' } })

afterEach(() => {
  vi.unstubAllGlobals()
  clearTokens()
})

describe('authFetch', () => {
  it('refreshes once when two requests hit TOKEN_EXPIRED at the same time', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'refresh-1' })
    let refreshCalls = 0

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(new URL(String(input), 'http://localhost'), init)
      if (request.url.endsWith('/auth/refresh')) {
        refreshCalls += 1
        // Slow enough that the second 401 arrives while this is in flight.
        await new Promise((resolve) => setTimeout(resolve, 20))
        return json(200, { tokenType: 'Bearer', accessToken: 'new', expiresIn: 900, refreshToken: 'refresh-2' })
      }
      if (request.headers.get('Authorization') === 'Bearer old') return expired()
      return json(200, { id: 1, email: 'a@b.c', name: 'A', role: 'user', createdAt: '' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const [first, second] = await Promise.all([call(api.GET('/me')), call(api.GET('/me'))])

    expect(refreshCalls).toBe(1)
    expect(first).toMatchObject({ id: 1 })
    expect(second).toMatchObject({ id: 1 })
    expect(getAccessToken()).toBe('new')
    expect(getRefreshToken()).toBe('refresh-2')
  })

  it('signs out when the refresh token is rejected', async () => {
    setTokens({ accessToken: 'old', refreshToken: 'used' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input)
        if (url.endsWith('/auth/refresh')) return json(401, { error: { code: 'INVALID_REFRESH_TOKEN', message: '' } })
        return expired()
      }),
    )

    await expect(call(api.GET('/me'))).rejects.toMatchObject({ status: 401, code: 'TOKEN_EXPIRED' })
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('turns error bodies into a typed ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(409, { error: { code: 'SEATS_TAKEN', message: 'Seat(s) already taken: B4', details: [] } }),
      ),
    )
    await expect(
      call(api.POST('/reservations', { body: { showtimeId: 1, seatIds: [12] } })),
    ).rejects.toMatchObject({ name: 'ApiError', status: 409, code: 'SEATS_TAKEN' })
  })
})
