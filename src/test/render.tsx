import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Outlet, RouterProvider, createMemoryRouter, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import type { User } from '../api/types'
import { AuthContext, type Auth } from '../auth/context'
import { ToastProvider } from '../components/Toast'
import { Probe } from './Probe'

export function testQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  })
}

export function fakeAuth(over: Partial<Auth> = {}): Auth {
  return {
    status: 'signedOut',
    user: null,
    signIn: vi.fn(async () => {}),
    signUp: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    ...over,
  }
}

export const signedInAs = (user: User, over: Partial<Auth> = {}) => fakeAuth({ status: 'signedIn', user, ...over })

interface Options {
  // The URL to start at.
  path?: string
  // The route pattern `ui` is mounted on (defaults to the path's pathname).
  route?: string
  // Router state for the first entry.
  state?: unknown
  auth?: Auth
  queryClient?: QueryClient
  // Children of the route, for layouts that render an <Outlet>.
  children?: RouteObject[]
}

// Renders `ui` inside the app's providers and a memory router.
export function renderPage(ui: ReactNode, options: Options = {}) {
  const path = options.path ?? '/'
  const route = options.route ?? new URL(path, 'http://x').pathname
  const auth = options.auth ?? fakeAuth()
  const queryClient = options.queryClient ?? testQueryClient()

  const router = createMemoryRouter(
    [
      {
        element: (
          <>
            <Outlet />
            <Probe />
          </>
        ),
        children: [
          { path: route, element: ui, children: options.children },
          { path: '*', element: null },
        ],
      },
    ],
    { initialEntries: [{ pathname: new URL(path, 'http://x').pathname, search: new URL(path, 'http://x').search, state: options.state }] },
  )

  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )

  return { ...result, router, queryClient, auth, user: userEvent.setup() }
}

// The current location as the probe shows it.
export const locationOf = (container: { getByTestId: (id: string) => HTMLElement }) =>
  container.getByTestId('location').textContent

export const stateOf = (container: { getByTestId: (id: string) => HTMLElement }) =>
  JSON.parse(container.getByTestId('location').dataset.state ?? 'null')
