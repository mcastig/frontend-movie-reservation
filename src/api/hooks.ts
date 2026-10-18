import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { config } from '../config'
import { dateIn } from '../lib/time'
import { api, call } from './client'
import type {
  AdminReservation,
  Genre,
  Listings,
  Movie,
  MovieInput,
  MoviePatch,
  MovieReport,
  Paginated,
  Reservation,
  SeatPlan,
  Showtime,
  ShowtimeInput,
  ShowtimeReport,
  User,
} from './types'

export const keys = {
  me: ['me'] as const,
  listings: (date: string) => ['listings', date] as const,
  genres: ['genres'] as const,
  movies: (params: { page?: number; genre?: number }) => ['movies', params] as const,
  movie: (id: number) => ['movie', id] as const,
  seats: (showtimeId: number) => ['seats', showtimeId] as const,
  myBookings: ['bookings', 'me'] as const,
  adminBookings: (filters: AdminBookingFilters) => ['admin', 'bookings', filters] as const,
  showtimeReport: (range: Range) => ['admin', 'reports', 'showtimes', range] as const,
  movieReport: (range: Range) => ['admin', 'reports', 'movies', range] as const,
}

interface Range {
  from: string
  to: string
}

export interface AdminBookingFilters {
  page: number
  limit?: number
  showtimeId?: number
  status?: 'confirmed' | 'cancelled'
  from?: string
  to?: string
}

// ── Listings ────────────────────────────────────────────────

export function fetchListings(date: string) {
  return call<Listings>(api.GET('/movies/showtimes', { params: { query: { date } } }))
}

export function useListings(date: string) {
  return useQuery({ queryKey: keys.listings(date), queryFn: () => fetchListings(date) })
}

// The cinema's timezone, as the listings report it.
export function useCinemaTimezone(): string {
  const { data } = useListings(dateIn(config.defaultTimezone))
  return data?.timezone ?? config.defaultTimezone
}

export function useGenres() {
  return useQuery({
    queryKey: keys.genres,
    queryFn: () => call<Genre[]>(api.GET('/genres')),
    staleTime: 5 * 60_000,
  })
}

export function useMovies(params: { page?: number; genre?: number } = {}) {
  return useQuery({
    queryKey: keys.movies(params),
    queryFn: () =>
      call<Paginated<Movie>>(api.GET('/movies', { params: { query: { limit: 100, ...params } } })),
    placeholderData: keepPreviousData,
  })
}

export function useMovie(id: number, enabled = true) {
  return useQuery({
    queryKey: keys.movie(id),
    queryFn: () => call<Movie>(api.GET('/movies/{id}', { params: { path: { id } } })),
    enabled,
  })
}

// ── Seats and bookings ──────────────────────────────────────

// The seat plan isn't live: refetch while picking and when the page regains focus.
export function useSeatPlan(showtimeId: number) {
  return useQuery({
    queryKey: keys.seats(showtimeId),
    queryFn: () =>
      call<SeatPlan>(api.GET('/showtimes/{id}/seats', { params: { path: { id: showtimeId } } })),
    refetchInterval: config.seatPlanRefetchMs,
    refetchOnWindowFocus: 'always',
  })
}

export function useMyBookings(enabled: boolean) {
  return useQuery({
    queryKey: keys.myBookings,
    queryFn: () =>
      call<Paginated<Reservation>>(api.GET('/reservations/me', { params: { query: { limit: 100 } } })),
    enabled,
  })
}

export function useBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { showtimeId: number; seatIds: number[] }) =>
      call<Reservation>(api.POST('/reservations', { body })),
    onSettled: (_data, _error, { showtimeId }) => {
      queryClient.invalidateQueries({ queryKey: keys.seats(showtimeId) })
      queryClient.invalidateQueries({ queryKey: keys.myBookings })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      call<Reservation>(api.POST('/reservations/{id}/cancel', { params: { path: { id } } })),
    onSettled: (reservation) => {
      queryClient.invalidateQueries({ queryKey: keys.myBookings })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
      if (reservation) queryClient.invalidateQueries({ queryKey: keys.seats(reservation.showtime.id) })
    },
  })
}

// ── Back office ─────────────────────────────────────────────

function useInvalidating<TVars, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  prefixes: string[][],
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      prefixes.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
    },
  })
}

export function useCreateMovie() {
  return useInvalidating(
    (body: MovieInput) => call<Movie>(api.POST('/movies', { body })),
    [['movies'], ['listings']],
  )
}

export function useUpdateMovie() {
  return useInvalidating(
    ({ id, body }: { id: number; body: MoviePatch }) =>
      call<Movie>(api.PATCH('/movies/{id}', { params: { path: { id } }, body })),
    [['movies'], ['movie'], ['listings']],
  )
}

export function useDeleteMovie() {
  return useInvalidating(
    (id: number) => call<void>(api.DELETE('/movies/{id}', { params: { path: { id } } })),
    [['movies'], ['listings']],
  )
}

export function useCreateGenre() {
  return useInvalidating(
    (name: string) => call<Genre>(api.POST('/genres', { body: { name } })),
    [['genres']],
  )
}

export function useCreateShowtime() {
  return useInvalidating(
    (body: ShowtimeInput) => call<Showtime>(api.POST('/showtimes', { body })),
    [['listings'], ['admin']],
  )
}

export function useUpdateShowtimePrice() {
  return useInvalidating(
    ({ id, priceCents }: { id: number; priceCents: number }) =>
      call<Showtime>(api.PATCH('/showtimes/{id}', { params: { path: { id } }, body: { priceCents } })),
    [['listings'], ['seats'], ['admin']],
  )
}

export function useDeleteShowtime() {
  return useInvalidating(
    (id: number) => call<void>(api.DELETE('/showtimes/{id}', { params: { path: { id } } })),
    [['listings'], ['admin']],
  )
}

export function useAdminBookings(filters: AdminBookingFilters) {
  return useQuery({
    queryKey: keys.adminBookings(filters),
    queryFn: () =>
      call<Paginated<AdminReservation>>(
        api.GET('/admin/reservations', { params: { query: { limit: 25, ...filters } } }),
      ),
    placeholderData: keepPreviousData,
  })
}

export function useShowtimeReport(range: Range) {
  return useQuery({
    queryKey: keys.showtimeReport(range),
    queryFn: () => call<ShowtimeReport>(api.GET('/admin/reports/showtimes', { params: { query: range } })),
  })
}

export function useMovieReport(range: Range) {
  return useQuery({
    queryKey: keys.movieReport(range),
    queryFn: () => call<MovieReport>(api.GET('/admin/reports/movies', { params: { query: range } })),
  })
}

export function useChangeRole() {
  return useInvalidating(
    ({ id, role }: { id: number; role: User['role'] }) =>
      call<User>(api.PATCH('/users/{id}/role', { params: { path: { id } }, body: { role } })),
    [['admin']],
  )
}
