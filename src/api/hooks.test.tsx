import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fail, mockApi } from '../test/api'
import { admin, genres, listings, movie, page, reservation, seatPlan, today } from '../test/fixtures'
import { testQueryClient } from '../test/render'
import {
  keys,
  useAdminBookings,
  useBook,
  useCancelBooking,
  useChangeRole,
  useCinemaTimezone,
  useCreateGenre,
  useCreateMovie,
  useCreateShowtime,
  useDeleteMovie,
  useDeleteShowtime,
  useGenres,
  useListings,
  useMovie,
  useMovieReport,
  useMovies,
  useMyBookings,
  useSeatPlan,
  useShowtimeReport,
  useUpdateMovie,
  useUpdateShowtimePrice,
} from './hooks'

function setup<T>(hook: () => T) {
  const queryClient = testQueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { ...renderHook(hook, { wrapper }), queryClient, invalidate }
}

const invalidatedKeys = (invalidate: ReturnType<typeof setup>['invalidate']) =>
  invalidate.mock.calls.map(([filters]) => filters?.queryKey)

const query = (server: ReturnType<typeof mockApi>, index = 0) =>
  Object.fromEntries(new URL(server.requests[index].url).searchParams)

async function settle(queryClient: QueryClient) {
  await waitFor(() => expect(queryClient.isFetching() + queryClient.isMutating()).toBe(0))
}

describe('queries', () => {
  it('loads a day’s listings', async () => {
    const server = mockApi({ 'GET /movies/showtimes': listings([], '2026-10-20') })
    const { result } = setup(() => useListings('2026-10-20'))
    await waitFor(() => expect(result.current.data?.date).toBe('2026-10-20'))
    expect(query(server)).toEqual({ date: '2026-10-20' })
  })

  it('reads the cinema timezone from today’s listings, UTC until then', async () => {
    mockApi({ 'GET /movies/showtimes': { ...listings(), timezone: 'Europe/Madrid' } })
    const { result } = setup(() => useCinemaTimezone())
    expect(result.current).toBe('UTC')
    await waitFor(() => expect(result.current).toBe('Europe/Madrid'))
  })

  it('loads genres, movies and a movie', async () => {
    const server = mockApi({
      'GET /genres': genres,
      'GET /movies': page([movie()]),
      'GET /movies/{id}': ({ params }) => movie({ id: Number(params.id) }),
    })
    const { result, queryClient } = setup(() => ({
      genres: useGenres(),
      movies: useMovies(),
      filtered: useMovies({ page: 2, genre: 1 }),
      movie: useMovie(4),
      disabled: useMovie(5, false),
    }))
    await settle(queryClient)
    expect(result.current.genres.data).toEqual(genres)
    expect(result.current.movies.data?.data).toHaveLength(1)
    expect(result.current.movie.data?.id).toBe(4)
    expect(result.current.disabled.fetchStatus).toBe('idle')
    const movieQueries = server.matching('GET', '/movies').map((r) => Object.fromEntries(new URL(r.url).searchParams))
    expect(movieQueries).toEqual(expect.arrayContaining([{ limit: '100' }, { limit: '100', page: '2', genre: '1' }]))
  })

  it('loads the seat plan and my bookings', async () => {
    mockApi({ 'GET /showtimes/{id}/seats': seatPlan(), 'GET /reservations/me': page([reservation()]) })
    const { result, queryClient } = setup(() => ({
      plan: useSeatPlan(10),
      mine: useMyBookings(true),
      notYet: useMyBookings(false),
    }))
    await settle(queryClient)
    expect(result.current.plan.data?.showtime.id).toBe(10)
    expect(result.current.mine.data?.data[0].id).toBe(100)
  })

  it('loads admin bookings and reports', async () => {
    const server = mockApi({
      'GET /admin/reservations': page([]),
      'GET /admin/reports/showtimes': { range: {}, totals: {}, showtimes: [] },
      'GET /admin/reports/movies': { range: {}, totals: {}, movies: [] },
    })
    const range = { from: '2026-10-01T00:00:00+00:00', to: '2026-10-31T00:00:00+00:00' }
    const { queryClient } = setup(() => ({
      bookings: useAdminBookings({ page: 2, status: 'cancelled' }),
      showtimes: useShowtimeReport(range),
      movies: useMovieReport(range),
    }))
    await settle(queryClient)
    expect(Object.fromEntries(new URL(server.matching('GET', '/admin/reservations')[0].url).searchParams)).toEqual({
      limit: '25',
      page: '2',
      status: 'cancelled',
    })
    expect(Object.fromEntries(new URL(server.matching('GET', '/admin/reports/movies')[0].url).searchParams)).toEqual(
      range,
    )
  })
})

describe('bookings', () => {
  it('books, then refreshes the seat plan, my bookings and listings, even on failure', async () => {
    const server = mockApi({ 'POST /reservations': fail(409, 'SEATS_TAKEN') })
    const { result, invalidate, queryClient } = setup(() => useBook())
    act(() => result.current.mutate({ showtimeId: 10, seatIds: [1, 2] }))
    await settle(queryClient)
    expect(result.current.error).toMatchObject({ code: 'SEATS_TAKEN' })
    expect(await server.body('POST', '/reservations')).toEqual({ showtimeId: 10, seatIds: [1, 2] })
    expect(invalidatedKeys(invalidate)).toEqual([keys.seats(10), keys.myBookings, ['listings']])
  })

  it('cancels, and refreshes that showtime’s seat plan', async () => {
    const server = mockApi({ 'POST /reservations/{id}/cancel': reservation({ status: 'cancelled' }) })
    const { result, invalidate, queryClient } = setup(() => useCancelBooking())
    act(() => result.current.mutate(100))
    await settle(queryClient)
    expect(server.matching('POST', '/reservations/100/cancel')).toHaveLength(1)
    expect(invalidatedKeys(invalidate)).toEqual([keys.myBookings, ['listings'], ['admin'], keys.seats(10)])
  })

  it('refreshes lists after a failed cancel too', async () => {
    mockApi({ 'POST /reservations/{id}/cancel': fail(409, 'SHOWTIME_STARTED') })
    const { result, invalidate, queryClient } = setup(() => useCancelBooking())
    act(() => result.current.mutate(100))
    await settle(queryClient)
    expect(invalidatedKeys(invalidate)).toEqual([keys.myBookings, ['listings'], ['admin']])
  })
})

describe('back office mutations', () => {
  const cases = [
    {
      name: 'creates a movie',
      hook: useCreateMovie,
      vars: { title: 'Up', description: 'Balloons.', durationMinutes: 96, genreIds: [] },
      method: 'POST',
      path: '/movies',
      body: { title: 'Up', description: 'Balloons.', durationMinutes: 96, genreIds: [] },
      invalidates: [['movies'], ['listings']],
    },
    {
      name: 'updates a movie',
      hook: useUpdateMovie,
      vars: { id: 3, body: { title: 'Up!' } },
      method: 'PATCH',
      path: '/movies/3',
      body: { title: 'Up!' },
      invalidates: [['movies'], ['movie'], ['listings']],
    },
    {
      name: 'deletes a movie',
      hook: useDeleteMovie,
      vars: 3,
      method: 'DELETE',
      path: '/movies/3',
      body: undefined,
      invalidates: [['movies'], ['listings']],
    },
    {
      name: 'creates a genre',
      hook: useCreateGenre,
      vars: 'Horror',
      method: 'POST',
      path: '/genres',
      body: { name: 'Horror' },
      invalidates: [['genres']],
    },
    {
      name: 'creates a showtime',
      hook: useCreateShowtime,
      vars: { movieId: 1, hallId: 2, startsAt: `${today()}T20:00:00+00:00`, priceCents: 1200 },
      method: 'POST',
      path: '/showtimes',
      body: { movieId: 1, hallId: 2, startsAt: `${today()}T20:00:00+00:00`, priceCents: 1200 },
      invalidates: [['listings'], ['admin']],
    },
    {
      name: 'changes a showtime’s price',
      hook: useUpdateShowtimePrice,
      vars: { id: 9, priceCents: 900 },
      method: 'PATCH',
      path: '/showtimes/9',
      body: { priceCents: 900 },
      invalidates: [['listings'], ['seats'], ['admin']],
    },
    {
      name: 'deletes a showtime',
      hook: useDeleteShowtime,
      vars: 9,
      method: 'DELETE',
      path: '/showtimes/9',
      body: undefined,
      invalidates: [['listings'], ['admin']],
    },
    {
      name: 'changes a role',
      hook: useChangeRole,
      vars: { id: 1, role: 'admin' },
      method: 'PATCH',
      path: '/users/1/role',
      body: { role: 'admin' },
      invalidates: [['admin']],
    },
  ] as const

  it.each(cases)('$name', async ({ hook, vars, method, path, body, invalidates }) => {
    const server = mockApi({ [`${method} ${path}`]: admin })
    const { result, invalidate, queryClient } = setup(() => (hook as () => { mutate: (v: unknown) => void })())
    act(() => result.current.mutate(vars))
    await settle(queryClient)
    expect(server.matching(method, path)).toHaveLength(1)
    if (body) expect(await server.body(method, path)).toEqual(body)
    expect(invalidatedKeys(invalidate)).toEqual(invalidates)
  })

  it('doesn’t invalidate anything when a mutation fails', async () => {
    mockApi({ 'POST /genres': fail(409, 'GENRE_EXISTS') })
    const { result, invalidate, queryClient } = setup(() => useCreateGenre())
    act(() => result.current.mutate('Drama'))
    await settle(queryClient)
    expect(result.current.isError).toBe(true)
    expect(invalidate).not.toHaveBeenCalled()
  })
})
