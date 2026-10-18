import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, call, refreshSession } from '../api/client'
import { keys } from '../api/hooks'
import { clearTokens, getRefreshToken, onSessionEnd, setTokens } from '../api/session'
import type { SignupInput, Tokens, User } from '../api/types'
import { AuthContext, type Auth } from './context'

const fetchMe = () => call<User>(api.GET('/me'))

// One restore per page load, even when StrictMode mounts twice.
let restoring: Promise<User | null> | null = null
function restoreSession() {
  restoring ??= (async () => {
    if (!getRefreshToken()) return null
    try {
      return (await refreshSession()) ? await fetchMe() : null
    } catch {
      return null
    }
  })()
  return restoring
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Auth['status']>('loading')

  const signedOut = useCallback(() => {
    setUser(null)
    setStatus('signedOut')
    queryClient.removeQueries({ queryKey: keys.myBookings })
    queryClient.removeQueries({ queryKey: ['admin'] })
  }, [queryClient])

  useEffect(() => {
    let active = true
    restoreSession().then((restored) => {
      if (!active) return
      setUser(restored)
      setStatus(restored ? 'signedIn' : 'signedOut')
    })
    // A refresh can fail at any time (the API signs the user out everywhere when
    // a refresh token is reused); the UI follows.
    const unsubscribe = onSessionEnd(signedOut)
    return () => {
      active = false
      unsubscribe()
    }
  }, [signedOut])

  const signIn = useCallback(async (email: string, password: string) => {
    const tokens = await call<Tokens>(api.POST('/auth/login', { body: { email, password } }))
    setTokens(tokens)
    const me = await fetchMe()
    setUser(me)
    setStatus('signedIn')
  }, [])

  const signUp = useCallback(
    async (input: SignupInput) => {
      await call<User>(api.POST('/auth/signup', { body: input }))
      await signIn(input.email, input.password)
    },
    [signIn],
  )

  const signOut = useCallback(async () => {
    const refreshToken = getRefreshToken()
    clearTokens()
    signedOut()
    if (refreshToken) {
      try {
        await call<void>(api.POST('/auth/logout', { body: { refreshToken } }))
      } catch {
        // The tokens are gone from this browser either way.
      }
    }
  }, [signedOut])

  const value = useMemo<Auth>(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
