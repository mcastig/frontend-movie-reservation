import { describe, expect, it } from 'vitest'
import { joinSeats, movieMeta, seatCode } from './movie'

describe('movie', () => {
  it('describes length and genres with commas', () => {
    expect(
      movieMeta({
        durationMinutes: 148,
        genres: [
          { id: 1, name: 'Action' },
          { id: 2, name: 'Sci-Fi' },
        ],
      }),
    ).toBe('2 h 28 min, Action, Sci-Fi')
    expect(movieMeta({ durationMinutes: 45, genres: [] })).toBe('45 min')
  })

  it('joins seat codes like a sentence', () => {
    expect(joinSeats([])).toBe('')
    expect(joinSeats(['B3'])).toBe('B3')
    expect(joinSeats(['B3', 'B4'])).toBe('B3 and B4')
    expect(joinSeats(['B3', 'B4', 'B5'])).toBe('B3, B4 and B5')
  })

  it('names a seat by row and number', () => {
    expect(seatCode({ row: 'C', number: 12 })).toBe('C12')
  })
})
