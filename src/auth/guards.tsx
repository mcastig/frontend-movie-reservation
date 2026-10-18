import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { PageState } from '../components/PageState'
import { useAuth } from './context'

// Signed-out visitors go to sign-in and come back to the same page afterwards.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <PageState kind="loading" />
  if (status === 'signedOut') return <Navigate to="/signin" replace state={{ from: location }} />
  return children
}

// Hiding the back office is cosmetic; the API enforces admin permissions.
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return (
    <RequireAuth>
      {user?.role === 'admin' ? children : <PageState kind="empty" message="You don’t have access to this." />}
    </RequireAuth>
  )
}
