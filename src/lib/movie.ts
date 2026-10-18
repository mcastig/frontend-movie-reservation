import type { Movie } from '../api/types'
import { formatDuration } from './time'

// "2 h 28 min, Action, Sci-Fi": commas, never middle dots.
export function movieMeta(movie: Pick<Movie, 'durationMinutes' | 'genres'>): string {
  return [formatDuration(movie.durationMinutes), ...movie.genres.map((g) => g.name)].join(', ')
}

// "B3 and B4", "B3, B4 and B5"
export function joinSeats(codes: string[]): string {
  if (codes.length <= 1) return codes.join('')
  return `${codes.slice(0, -1).join(', ')} and ${codes.at(-1)}`
}

export const seatCode = (seat: { row: string; number: number }) => `${seat.row}${seat.number}`
