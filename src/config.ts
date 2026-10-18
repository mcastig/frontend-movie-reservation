const env = import.meta.env

export const config = {
  // Dev requests go through the Vite proxy (see vite.config.ts); builds call the API directly.
  apiUrl: env.DEV ? `${location.origin}/api` : (env.VITE_API_URL ?? 'http://localhost:3000'),
  currency: env.VITE_CURRENCY ?? 'USD',
  cinemaName: env.VITE_CINEMA_NAME ?? 'The Lantern',
  // Used until the listings tell us the cinema's timezone.
  defaultTimezone: 'UTC',
  maxSeatsPerBooking: 10,
  seatPlanRefetchMs: 15_000,
  wakeUpNoticeMs: 2_000,
}
