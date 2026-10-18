import createClient from 'openapi-fetch'
import { config } from '../config'
import { apiErrorFrom, signInCodes, toApiError } from './errors'
import type { paths } from './schema'
import { endSession, getAccessToken, getRefreshToken, setTokens } from './session'
import type { Tokens } from './types'

let refreshing: Promise<boolean> | null = null

// Exchanges the refresh token for a new pair. Refresh tokens work once, and the
// API treats a reused one as theft and signs the user out everywhere, so every
// caller shares one in-flight refresh.
export function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false
    const response = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) {
      if (response.status === 400 || response.status === 401) endSession()
      return false
    }
    setTokens((await response.json()) as Tokens)
    return true
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

function withToken(request: Request, token: string | null) {
  if (!token) return request
  const headers = new Headers(request.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return new Request(request, { headers })
}

// Adds the bearer token, and on TOKEN_EXPIRED refreshes and retries once.
export async function authFetch(request: Request): Promise<Response> {
  const retry = request.clone()
  const usedToken = getAccessToken()
  const response = await fetch(withToken(request, usedToken))
  if (response.status !== 401) return response

  const error = await toApiError(response)
  if (error.code !== 'TOKEN_EXPIRED') {
    if (usedToken && signInCodes.has(error.code)) endSession()
    return response
  }
  // Another request may have refreshed while this one was in flight.
  const refreshed = getAccessToken() !== usedToken || (await refreshSession())
  if (!refreshed) return response
  return fetch(withToken(retry, getAccessToken()))
}

export const api = createClient<paths>({ baseUrl: config.apiUrl, fetch: authFetch })

// Unwraps an openapi-fetch result: the data on success, an ApiError otherwise.
// Responses aren't described in the OpenAPI document, so callers name the type.
export async function call<T>(
  pending: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await pending
  if (!response.ok) throw apiErrorFrom(response, error)
  return data as T
}
