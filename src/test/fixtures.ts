import type {
  AdminReservation,
  Genre,
  ListingShowtime,
  Listings,
  Movie,
  Reservation,
  SeatPlan,
  User,
} from '../api/types'
import { addDays, dateIn } from '../lib/time'

// The fake cinema runs on UTC, so dates in tests match the browser-independent formatting.
export const TZ = 'UTC'

export const today = () => dateIn(TZ)

// "YYYY-MM-DDTHH:MM:00.000Z", `days` from today.
export const at = (days: number, time = '20:00') => `${addDays(today(), days)}T${time}:00.000Z`

export const drama: Genre = { id: 1, name: 'Drama' }
export const scifi: Genre = { id: 2, name: 'Sci-Fi' }
export const genres = [drama, scifi]

export const hall1 = { id: 1, name: 'Hall 1' }
export const hall2 = { id: 2, name: 'Hall 2' }

export function movie(over: Partial<Movie> = {}): Movie {
  return {
    id: 1,
    title: 'Inception',
    description: 'A thief who steals secrets through dreams.',
    posterUrl: 'https://example.com/inception.jpg',
    durationMinutes: 148,
    createdAt: '2026-01-01T00:00:00.000Z',
    genres: [scifi],
    ...over,
  }
}

export function showtime(over: Partial<ListingShowtime> = {}): ListingShowtime {
  return {
    id: 10,
    startsAt: at(1, '14:00'),
    endsAt: at(1, '16:43'),
    priceCents: 1200,
    seatsAvailable: 38,
    hall: hall1,
    ...over,
  }
}

export function listings(movies: Listings['movies'] = [], date = today()): Listings {
  return { date, timezone: TZ, movies }
}

export function listed(over: Partial<Movie> = {}, showtimes: ListingShowtime[] = [showtime()]) {
  return { ...movie(over), showtimes }
}

export function seatPlan(over: Partial<SeatPlan['showtime']> = {}, rows?: SeatPlan['rows']): SeatPlan {
  const plan = rows ?? [
    {
      row: 'A',
      seats: [
        { id: 1, number: 1, available: true },
        { id: 2, number: 2, available: true },
        { id: 3, number: 3, available: false },
      ],
    },
    {
      row: 'B',
      seats: [
        { id: 4, number: 1, available: true },
        { id: 5, number: 2, available: true },
        { id: 6, number: 3, available: true },
      ],
    },
  ]
  const seats = plan.flatMap((r) => r.seats)
  return {
    showtime: {
      id: 10,
      startsAt: at(1, '14:00'),
      endsAt: at(1, '16:43'),
      priceCents: 1200,
      movie: { id: 1, title: 'Inception', durationMinutes: 148 },
      hall: hall1,
      ...over,
    },
    totalSeats: seats.length,
    availableSeats: seats.filter((s) => s.available).length,
    rows: plan,
  }
}

export function reservation(over: Partial<Reservation> = {}): Reservation {
  return {
    id: 100,
    userId: 7,
    status: 'confirmed',
    totalCents: 2400,
    createdAt: at(-1, '10:00'),
    cancelledAt: null,
    showtime: {
      id: 10,
      startsAt: at(1, '14:00'),
      endsAt: at(1, '16:43'),
      movie: { id: 1, title: 'Inception' },
      hall: hall1,
    },
    seats: [
      { id: 5, row: 'B', number: 2, priceCents: 1200 },
      { id: 4, row: 'B', number: 1, priceCents: 1200 },
    ],
    ...over,
  }
}

export function adminReservation(over: Partial<AdminReservation> = {}): AdminReservation {
  return { ...reservation(), user: { id: 7, name: 'Ana Ruiz', email: 'ana@example.com' }, ...over }
}

export const guest: User = { id: 7, email: 'ana@example.com', name: 'Ana Ruiz', role: 'user', createdAt: '2026-01-01T00:00:00.000Z' }
export const admin: User = { id: 1, email: 'boss@example.com', name: 'Box Office', role: 'admin', createdAt: '2026-01-01T00:00:00.000Z' }

export const page = <T>(data: T[], over: Partial<{ page: number; totalPages: number; total: number }> = {}) => ({
  data,
  pagination: { page: 1, limit: 25, total: data.length, totalPages: 1, ...over },
})
