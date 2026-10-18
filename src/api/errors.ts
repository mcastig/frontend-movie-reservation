export interface ErrorDetail {
  path?: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ErrorDetail[]
  readonly requestId?: string
  // Seconds until the rate limit resets, from the `RateLimit` header (429 only).
  readonly retryAfterSeconds?: number

  constructor(init: {
    status: number
    code: string
    message: string
    details?: ErrorDetail[]
    requestId?: string
    retryAfterSeconds?: number
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.details = init.details ?? []
    this.requestId = init.requestId
    this.retryAfterSeconds = init.retryAfterSeconds
  }

  // The message for one form field, matched on the end of `details[].path` ("body.email" → "email").
  fieldError(field: string): string | undefined {
    return this.details.find((d) => d.path?.split('.').at(-1) === field)?.message
  }
}

export function parseRateLimit(header: string | null): number | undefined {
  const match = header?.match(/t=(\d+)/)
  return match ? Number(match[1]) : undefined
}

// Reads the error body from a clone, so the original response stays readable.
export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown
  try {
    body = await response.clone().json()
  } catch {
    body = undefined
  }
  return apiErrorFrom(response, body)
}

export function apiErrorFrom(response: Response, body: unknown): ApiError {
  const error = (body as { error?: Partial<ApiError> & { details?: ErrorDetail[] } } | undefined)?.error
  return new ApiError({
    status: response.status,
    code: error?.code ?? (response.status >= 500 ? 'INTERNAL_ERROR' : 'UNKNOWN'),
    message: error?.message ?? response.statusText,
    details: Array.isArray(error?.details) ? error.details : [],
    requestId: error?.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
    retryAfterSeconds: parseRateLimit(response.headers.get('RateLimit')),
  })
}

export const signInCodes = new Set(['INVALID_TOKEN', 'UNAUTHENTICATED', 'INVALID_REFRESH_TOKEN'])

// What to tell a person about an error. Branches on `code`; `message` is the
// API's own wording and is only used where the API's message is the clearest fix.
export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'The box office can’t be reached. Check your connection and try again.'
  }
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.'
    case 'EMAIL_TAKEN':
      return 'There’s already an account with this email. Sign in instead.'
    case 'FORBIDDEN':
      return 'You don’t have access to this.'
    case 'CANNOT_CHANGE_OWN_ROLE':
      return 'You don’t have access to this. You can’t change your own role; ask another admin.'
    case 'SHOWTIME_STARTED':
      return 'This showtime has started, so the booking can’t be cancelled.'
    case 'ALREADY_CANCELLED':
      return 'This booking was already cancelled.'
    case 'HALL_BUSY':
      return 'The hall is busy at that time. Pick another time or hall.'
    case 'GENRE_EXISTS':
      return 'That genre already exists.'
    case 'MOVIE_HAS_SHOWTIMES':
      return 'This movie has showtimes, so it can’t be deleted. Delete its showtimes first.'
    case 'SHOWTIME_HAS_RESERVATIONS':
      return 'This showtime has bookings, so only its price can change and it can’t be deleted.'
    case 'NOT_FOUND':
      return 'That page doesn’t exist, or it was removed.'
    case 'TOO_MANY_REQUESTS': {
      const minutes = error.retryAfterSeconds ? Math.max(1, Math.ceil(error.retryAfterSeconds / 60)) : undefined
      return minutes
        ? `Too many attempts. Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`
        : 'Too many attempts. Try again in a few minutes.'
    }
    case 'VALIDATION_ERROR':
      return error.details[0]?.message ?? 'Check the highlighted fields.'
    case 'BAD_REQUEST':
      return 'That’s too much text to save. Shorten the description.'
    case 'INTERNAL_ERROR':
      return `Something went wrong on our side. Reference: ${error.requestId ?? 'none'}.`
    default:
      if (signInCodes.has(error.code) || error.code === 'TOKEN_EXPIRED') return 'Sign in to continue.'
      return error.message
  }
}
