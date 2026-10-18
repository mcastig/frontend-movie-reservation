import { describe, expect, it, vi } from 'vitest'
import { clearTokens, endSession, getAccessToken, getRefreshToken, onSessionEnd, setTokens } from './session'

describe('session', () => {
  it('keeps the access token in memory and the refresh token in storage', () => {
    setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    expect(getAccessToken()).toBe('access')
    expect(getRefreshToken()).toBe('refresh')
    expect(localStorage.getItem('cinema.refreshToken')).toBe('refresh')

    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('tells listeners when a session ends, until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = onSessionEnd(listener)

    setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    endSession()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()

    // Nothing to end: no one is told.
    endSession()
    expect(listener).toHaveBeenCalledTimes(1)

    // A refresh token alone is a session.
    localStorage.setItem('cinema.refreshToken', 'stale')
    endSession()
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    endSession()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    setTokens({ accessToken: 'access', refreshToken: 'refresh' })
    expect(getAccessToken()).toBe('access')
    expect(getRefreshToken()).toBeNull()
    clearTokens()
    expect(getAccessToken()).toBeNull()
  })
})
