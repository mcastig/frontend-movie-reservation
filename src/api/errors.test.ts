import { describe, expect, it } from 'vitest'
import { ApiError, apiErrorFrom, describeError, parseRateLimit, toApiError } from './errors'

const error = (code: string, over: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ status: 400, code, message: `API says ${code}`, ...over })

describe('ApiError', () => {
  it('keeps the envelope fields, with empty details by default', () => {
    const e = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Gone' })
    expect(e).toBeInstanceOf(Error)
    expect(e).toMatchObject({ name: 'ApiError', status: 404, code: 'NOT_FOUND', message: 'Gone', details: [] })
    expect(e.requestId).toBeUndefined()
  })

  it('finds a field’s message by the end of its path', () => {
    const e = error('VALIDATION_ERROR', {
      details: [{ path: 'body.email', message: 'Not an email' }, { message: 'No path' }],
    })
    expect(e.fieldError('email')).toBe('Not an email')
    expect(e.fieldError('password')).toBeUndefined()
  })
})

describe('parseRateLimit', () => {
  it('reads the reset seconds', () => {
    expect(parseRateLimit('"auth";r=0;t=720')).toBe(720)
    expect(parseRateLimit('"default";r=12;t=30')).toBe(30)
  })

  it('is undefined without a header or a reset', () => {
    expect(parseRateLimit(null)).toBeUndefined()
    expect(parseRateLimit('"auth";r=3')).toBeUndefined()
  })
})

describe('apiErrorFrom', () => {
  it('reads the error envelope', () => {
    const response = new Response(null, { status: 429, headers: { RateLimit: 't=90' } })
    const e = apiErrorFrom(response, {
      error: { code: 'TOO_MANY_REQUESTS', message: 'Slow down', details: [{ message: 'x' }], requestId: 'req_1' },
    })
    expect(e).toMatchObject({
      status: 429,
      code: 'TOO_MANY_REQUESTS',
      message: 'Slow down',
      details: [{ message: 'x' }],
      requestId: 'req_1',
      retryAfterSeconds: 90,
    })
  })

  it('falls back for bodies that aren’t the envelope', () => {
    const server = apiErrorFrom(
      new Response(null, { status: 502, statusText: 'Bad Gateway', headers: { 'X-Request-Id': 'req_2' } }),
      'oops',
    )
    expect(server).toMatchObject({ code: 'INTERNAL_ERROR', message: 'Bad Gateway', details: [], requestId: 'req_2' })

    const client = apiErrorFrom(new Response(null, { status: 418 }), { error: { details: 'not a list' } })
    expect(client).toMatchObject({ code: 'UNKNOWN', details: [], requestId: undefined, retryAfterSeconds: undefined })
  })
})

describe('toApiError', () => {
  it('reads a JSON body without consuming the response', async () => {
    const response = new Response(JSON.stringify({ error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }), {
      status: 401,
    })
    const e = await toApiError(response)
    expect(e.code).toBe('TOKEN_EXPIRED')
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'TOKEN_EXPIRED' } })
  })

  it('copes with a body that isn’t JSON', async () => {
    const e = await toApiError(new Response('<html>', { status: 503, statusText: 'Unavailable' }))
    expect(e).toMatchObject({ code: 'INTERNAL_ERROR', message: 'Unavailable' })
  })
})

describe('describeError', () => {
  it('blames the connection for anything that isn’t an ApiError', () => {
    expect(describeError(new TypeError('Failed to fetch'))).toBe(
      'The box office can’t be reached. Check your connection and try again.',
    )
  })

  it.each([
    ['INVALID_CREDENTIALS', 'Email or password is incorrect.'],
    ['EMAIL_TAKEN', 'There’s already an account with this email. Sign in instead.'],
    ['FORBIDDEN', 'You don’t have access to this.'],
    ['CANNOT_CHANGE_OWN_ROLE', 'You don’t have access to this. You can’t change your own role; ask another admin.'],
    ['SHOWTIME_STARTED', 'This showtime has started, so the booking can’t be cancelled.'],
    ['ALREADY_CANCELLED', 'This booking was already cancelled.'],
    ['HALL_BUSY', 'The hall is busy at that time. Pick another time or hall.'],
    ['GENRE_EXISTS', 'That genre already exists.'],
    ['MOVIE_HAS_SHOWTIMES', 'This movie has showtimes, so it can’t be deleted. Delete its showtimes first.'],
    ['SHOWTIME_HAS_RESERVATIONS', 'This showtime has bookings, so only its price can change and it can’t be deleted.'],
    ['NOT_FOUND', 'That page doesn’t exist, or it was removed.'],
    ['BAD_REQUEST', 'That’s too much text to save. Shorten the description.'],
    ['INVALID_TOKEN', 'Sign in to continue.'],
    ['UNAUTHENTICATED', 'Sign in to continue.'],
    ['INVALID_REFRESH_TOKEN', 'Sign in to continue.'],
    ['TOKEN_EXPIRED', 'Sign in to continue.'],
  ])('%s', (code, text) => {
    expect(describeError(error(code))).toBe(text)
  })

  it('says how long to wait after too many attempts', () => {
    expect(describeError(error('TOO_MANY_REQUESTS', { retryAfterSeconds: 720 }))).toBe(
      'Too many attempts. Try again in 12 minutes.',
    )
    expect(describeError(error('TOO_MANY_REQUESTS', { retryAfterSeconds: 20 }))).toBe(
      'Too many attempts. Try again in 1 minute.',
    )
    expect(describeError(error('TOO_MANY_REQUESTS'))).toBe('Too many attempts. Try again in a few minutes.')
  })

  it('shows the first validation message', () => {
    expect(describeError(error('VALIDATION_ERROR', { details: [{ message: 'Title is required' }] }))).toBe(
      'Title is required',
    )
    expect(describeError(error('VALIDATION_ERROR'))).toBe('Check the highlighted fields.')
  })

  it('gives a reference for server errors', () => {
    expect(describeError(error('INTERNAL_ERROR', { requestId: 'req_9' }))).toBe(
      'Something went wrong on our side. Reference: req_9.',
    )
    expect(describeError(error('INTERNAL_ERROR'))).toBe('Something went wrong on our side. Reference: none.')
  })

  it('uses the API’s wording for anything else', () => {
    expect(describeError(error('SOMETHING_NEW'))).toBe('API says SOMETHING_NEW')
  })
})
