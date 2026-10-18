import { describe, expect, it, vi } from 'vitest'
import type { RouteObject } from 'react-router'

const load = async () => {
  vi.resetModules()
  return (await import('./router')).router
}

// Every path in the route tree, as "/parent/child".
function paths(routes: RouteObject[], base = ''): string[] {
  return routes.flatMap((route) => {
    const here = route.index ? base || '/' : route.path ? `${base}/${route.path}`.replace('//', '/') : base
    const own = route.index || route.path ? [here] : []
    return [...own, ...paths(route.children ?? [], here === '/' ? '' : here)]
  })
}

describe('router', () => {
  it('maps every page, with the style guide in development', async () => {
    vi.stubEnv('DEV', true)
    const router = await load()
    expect(paths(router.routes)).toEqual([
      '/',
      '/movies/:id',
      '/bookings',
      '/signin',
      '/signup',
      '/styleguide',
      '/*',
      '/showtimes/:id',
      '/admin',
      '/admin',
      '/admin/movies',
      '/admin/movies/new',
      '/admin/movies/:id',
      '/admin/schedule',
      '/admin/bookings',
      '/admin/reports',
      '/admin/users',
    ])
  })

  it('leaves the style guide out of builds', async () => {
    vi.stubEnv('DEV', false)
    const router = await load()
    expect(paths(router.routes)).not.toContain('/styleguide')
  })
})
