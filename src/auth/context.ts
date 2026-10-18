import { createContext, useContext } from 'react'
import type { SignupInput, User } from '../api/types'

export interface Auth {
  status: 'loading' | 'signedIn' | 'signedOut'
  user: User | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: SignupInput) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<Auth | null>(null)

export function useAuth(): Auth {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth needs <AuthProvider>')
  return auth
}
