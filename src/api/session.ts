import type { Tokens } from './types'

// The access token lives in memory only. The refresh token has to survive a
// reload, so it goes in localStorage until the API sets it as an httpOnly
// cookie (backend task B1).
const REFRESH_KEY = 'cinema.refreshToken'

let accessToken: string | null = null
const endListeners = new Set<() => void>()

export function getAccessToken() {
  return accessToken
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export function setTokens(tokens: Pick<Tokens, 'accessToken' | 'refreshToken'>) {
  accessToken = tokens.accessToken
  try {
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  } catch {
    // Private mode: the session lasts until the tab closes.
  }
}

export function clearTokens() {
  accessToken = null
  try {
    localStorage.removeItem(REFRESH_KEY)
  } catch {
    // Nothing stored.
  }
}

// Ends the session in this tab and tells the UI (the API may have signed the
// user out everywhere).
export function endSession() {
  const hadSession = accessToken !== null || getRefreshToken() !== null
  clearTokens()
  if (hadSession) endListeners.forEach((listener) => listener())
}

export function onSessionEnd(listener: () => void) {
  endListeners.add(listener)
  return () => {
    endListeners.delete(listener)
  }
}
