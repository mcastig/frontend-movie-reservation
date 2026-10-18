// Response shapes. The OpenAPI document only describes request bodies, so these
// mirror the "Response shapes" section of SPECS.md. Request bodies come from the
// generated schema.d.ts.
import type { paths } from './schema'

export type Role = 'user' | 'admin'

export interface Tokens {
  tokenType: 'Bearer'
  accessToken: string
  expiresIn: number
  refreshToken: string
}

export interface User {
  id: number
  email: string
  name: string
  role: Role
  createdAt: string
}

export interface Genre {
  id: number
  name: string
}

export interface Hall {
  id: number
  name: string
}

export interface Movie {
  id: number
  title: string
  description: string
  posterUrl: string | null
  durationMinutes: number
  createdAt: string
  genres: Genre[]
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  pagination: Pagination
}

export interface ListingShowtime {
  id: number
  startsAt: string
  endsAt: string
  priceCents: number
  seatsAvailable: number
  hall: Hall
}

export interface Listings {
  date: string
  timezone: string
  movies: (Movie & { showtimes: ListingShowtime[] })[]
}

export interface Seat {
  id: number
  number: number
  available: boolean
}

export interface SeatPlan {
  showtime: {
    id: number
    startsAt: string
    endsAt: string
    priceCents: number
    movie: { id: number; title: string; durationMinutes: number }
    hall: Hall
  }
  totalSeats: number
  availableSeats: number
  rows: { row: string; seats: Seat[] }[]
}

export interface Reservation {
  id: number
  userId: number
  status: 'confirmed' | 'cancelled'
  totalCents: number
  createdAt: string
  cancelledAt: string | null
  showtime: {
    id: number
    startsAt: string
    endsAt: string
    movie: { id: number; title: string }
    hall: Hall
  }
  seats: { id: number; row: string; number: number; priceCents: number }[]
}

export type AdminReservation = Reservation & {
  user: { id: number; name: string; email: string }
}

export interface ShowtimeReportRow {
  id: number
  startsAt: string
  movie: { id: number; title: string }
  hall: Hall
  capacity: number
  ticketsSold: number
  occupancyPct: number
  revenueCents: number
  cancelledReservations: number
}

export interface ShowtimeReport {
  range: { from: string; to: string }
  totals: {
    showtimes: number
    capacity: number
    ticketsSold: number
    occupancyPct: number
    revenueCents: number
    cancelledReservations: number
  }
  showtimes: ShowtimeReportRow[]
}

export interface MovieReport {
  range: { from: string; to: string }
  totals: { ticketsSold: number; revenueCents: number }
  movies: { id: number; title: string; ticketsSold: number; revenueCents: number }[]
}

export interface Showtime {
  id: number
  startsAt: string
  endsAt: string
  priceCents: number
  movie: { id: number; title: string }
  hall: Hall
}

type JsonBody<P extends keyof paths, M extends keyof paths[P]> = paths[P][M] extends {
  requestBody?: { content: { 'application/json': infer B } }
}
  ? B
  : never

export type MovieInput = JsonBody<'/movies', 'post'>
export type MoviePatch = JsonBody<'/movies/{id}', 'patch'>
export type ShowtimeInput = JsonBody<'/showtimes', 'post'>
export type SignupInput = JsonBody<'/auth/signup', 'post'>
export type LoginInput = JsonBody<'/auth/login', 'post'>
