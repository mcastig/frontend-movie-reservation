import { useQueries } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { ApiError, describeError } from '../../api/errors'
import { fetchListings, keys, useCinemaTimezone, useCreateShowtime, useDeleteShowtime, useMovies } from '../../api/hooks'
import type { Hall, ListingShowtime } from '../../api/types'
import { Button } from '../../components/Button'
import { Field, TextField } from '../../components/Field'
import { PageState } from '../../components/PageState'
import { useToast } from '../../components/toast-context'
import { config } from '../../config'
import { formatMoney } from '../../lib/money'
import { addDays, dateIn, formatDay, formatDayOf, formatTime, zonedIso } from '../../lib/time'
import styles from './admin.module.css'

// Halls are found in the listings until the API has GET /halls (backend task B2).
const HALL_LOOKAHEAD_DAYS = 14

type Slot = ListingShowtime & { movieTitle: string }

export function AdminSchedulePage() {
  const timezone = useCinemaTimezone()
  const today = dateIn(timezone)
  const [weekStart, setWeekStart] = useState(today)
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const lookahead = Array.from({ length: HALL_LOOKAHEAD_DAYS }, (_, i) => addDays(today, i))
  const dates = [...new Set([...week, ...lookahead])]

  const results = useQueries({
    queries: dates.map((date) => ({ queryKey: keys.listings(date), queryFn: () => fetchListings(date) })),
  })
  const byDate = new Map(dates.map((date, i) => [date, results[i]]))

  const halls = new Map<number, Hall>()
  results.forEach((r) => r.data?.movies.forEach((m) => m.showtimes.forEach((s) => halls.set(s.hall.id, s.hall))))
  const hallList = [...halls.values()].sort((a, b) => a.id - b.id)

  // The grid only renders once the week has loaded; the fallback is defensive.
  /* v8 ignore start */
  const moviesOn = (date: string) => byDate.get(date)?.data?.movies ?? []
  /* v8 ignore stop */
  const slots = (date: string, hallId: number): Slot[] =>
    moviesOn(date)
      .flatMap((m) => m.showtimes.map((s) => ({ ...s, movieTitle: m.title })))
      .filter((s) => s.hall.id === hallId)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const weekLoading = week.some((d) => byDate.get(d)?.isPending)
  const weekError = week.map((d) => byDate.get(d)?.error).find(Boolean)

  return (
    <>
      <section className={styles.section} aria-labelledby="schedule-title">
        <div className={styles.titleRow}>
          <h1 id="schedule-title" className={styles.title}>
            Schedule
          </h1>
          <div className={styles.pager}>
            <Button variant="quiet" small onClick={() => setWeekStart(addDays(weekStart, -7))} disabled={weekStart <= today}>
              Previous week
            </Button>
            <span>
              {formatDay(week[0])} to {formatDay(week[6])}
            </span>
            <Button variant="quiet" small onClick={() => setWeekStart(addDays(weekStart, 7))}>
              Next week
            </Button>
          </div>
        </div>
        <p className={styles.note}>Upcoming showtimes, in the cinema’s timezone ({timezone}).</p>
        {weekError ? (
          <PageState kind="error" error={weekError} />
        ) : weekLoading ? (
          <PageState kind="loading" />
        ) : hallList.length === 0 ? (
          <PageState kind="empty" message="Nothing scheduled in the next two weeks. Schedule a showtime below." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${styles.week}`}>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  {hallList.map((hall) => (
                    <th key={hall.id} scope="col">
                      {hall.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {week.map((date) => (
                  <tr key={date}>
                    <th scope="row">{date === today ? 'Today' : formatDay(date)}</th>
                    {hallList.map((hall) => (
                      <td key={hall.id}>
                        {slots(date, hall.id).map((slot) => (
                          <ScheduleSlot key={slot.id} slot={slot} timezone={timezone} />
                        ))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ScheduleForm halls={hallList} timezone={timezone} today={today} />
    </>
  )
}

function ScheduleSlot({ slot, timezone }: { slot: Slot; timezone: string }) {
  const [confirming, setConfirming] = useState(false)
  const remove = useDeleteShowtime()
  const toast = useToast()
  const time = formatTime(slot.startsAt, timezone)

  return (
    <div className={styles.slot}>
      <strong>{time}</strong>
      <span>{slot.movieTitle}</span>
      <span className="quiet">
        to {formatTime(slot.endsAt, timezone)}, {formatMoney(slot.priceCents)}, {slot.seatsAvailable} left
      </span>
      {confirming ? (
        <>
          <button
            type="button"
            className={`${styles.linkButton} ${styles.danger}`}
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(slot.id, {
                onSuccess: () => toast({ message: `Deleted ${slot.movieTitle} at ${time}.` }),
                onError: (error) => toast({ message: describeError(error), tone: 'error' }),
                onSettled: () => setConfirming(false),
              })
            }
          >
            Yes, delete
          </button>
          <button type="button" className={styles.linkButton} onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </>
      ) : (
        <button
          type="button"
          className={`${styles.linkButton} ${styles.danger}`}
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${slot.movieTitle} at ${time}`}
        >
          Delete
        </button>
      )}
    </div>
  )
}

function ScheduleForm({ halls, timezone, today }: { halls: Hall[]; timezone: string; today: string }) {
  const movies = useMovies()
  const create = useCreateShowtime()
  const toast = useToast()
  const [error, setError] = useState<unknown>(null)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date'))
    const time = String(form.get('time'))
    const movieId = Number(form.get('movieId'))
    const hallId = Number(form.get('hallId'))
    setError(null)
    if (!date || !time) {
      const message = 'Pick a day and a start time.'
      setError(
        new ApiError({ status: 400, code: 'VALIDATION_ERROR', message, details: [{ path: 'body.startsAt', message }] }),
      )
      return
    }
    create.mutate(
      {
        movieId,
        hallId,
        // Sent with the cinema's offset, so the time means the same thing everywhere.
        startsAt: zonedIso(date, time, timezone),
        priceCents: Math.round(Number(form.get('price')) * 100),
      },
      {
        onSuccess: (showtime) => {
          const title = movies.data?.data.find((m) => m.id === movieId)?.title ?? 'The movie'
          const hall = halls.find((h) => h.id === hallId)?.name ?? `hall ${hallId}`
          toast({
            message: `Scheduled ${title} on ${formatDayOf(showtime.startsAt, timezone)} at ${formatTime(showtime.startsAt, timezone)} in ${hall}.`,
          })
        },
        onError: setError,
      },
    )
  }

  const apiError = error instanceof ApiError ? error : null
  const fieldError = (field: string) => (apiError?.code === 'VALIDATION_ERROR' ? apiError.fieldError(field) : undefined)
  const timeError = apiError?.code === 'HALL_BUSY' ? describeError(apiError) : fieldError('startsAt')

  return (
    <section className={styles.section} aria-labelledby="schedule-form-title">
      <h2 id="schedule-form-title" className={styles.subtitle}>
        Schedule a showtime
      </h2>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <Field label="Movie" error={fieldError('movieId')}>
          {(control) => (
            <select name="movieId" required {...control}>
              {movies.data?.data.map((movie) => (
                <option key={movie.id} value={movie.id}>
                  {movie.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        {halls.length > 0 ? (
          <Field label="Hall" error={fieldError('hallId')}>
            {(control) => (
              <select name="hallId" required {...control}>
                {halls.map((hall) => (
                  <option key={hall.id} value={hall.id}>
                    {hall.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : (
          <TextField
            label="Hall number"
            name="hallId"
            type="number"
            min={1}
            required
            hint="No halls show up in the next two weeks of listings, so enter the hall’s id."
            error={fieldError('hallId')}
          />
        )}
        <div className={styles.inline}>
          <TextField label="Day" name="date" type="date" min={today} defaultValue={addDays(today, 1)} required />
          <TextField
            label="Starts at"
            name="time"
            type="time"
            step={300}
            defaultValue="19:00"
            required
            error={timeError}
          />
        </div>
        <TextField
          label={`Price per seat (${config.currency})`}
          name="price"
          type="number"
          inputMode="decimal"
          min={0}
          max={1000}
          step="0.01"
          defaultValue="12.00"
          required
          error={fieldError('priceCents')}
        />
        <p className={styles.note}>
          Times are in {timezone}. The end time is worked out for you: the movie’s length plus the hall’s cleaning
          time, so back-to-back showtimes need that gap.
        </p>
        {error != null && apiError?.code !== 'VALIDATION_ERROR' && apiError?.code !== 'HALL_BUSY' && (
          <p className={styles.error} role="alert">
            {describeError(error)}
          </p>
        )}
        <div>
          <Button type="submit" disabled={create.isPending || !movies.data?.data.length}>
            {create.isPending ? 'Scheduling…' : 'Schedule showtime'}
          </Button>
        </div>
      </form>
    </section>
  )
}
