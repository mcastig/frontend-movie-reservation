import { useQueries } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { fetchListings, keys, useCinemaTimezone, useMovie } from '../api/hooks'
import { ButtonLink } from '../components/Button'
import { PageState } from '../components/PageState'
import { PosterFrame } from '../components/PosterFrame'
import { TimeButton } from '../components/TimeButton'
import { config } from '../config'
import { useDocumentTitle } from '../lib/lights'
import { movieMeta } from '../lib/movie'
import { addDays, dateIn, formatDay } from '../lib/time'
import { NotFoundPage } from './NotFound'
import styles from './Movie.module.css'

const DAYS = 7

export function MoviePage() {
  const id = Number(useParams().id)
  const movie = useMovie(id)
  const timezone = useCinemaTimezone()
  const today = dateIn(timezone)
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i))

  const listings = useQueries({
    queries: days.map((date) => ({ queryKey: keys.listings(date), queryFn: () => fetchListings(date) })),
  })

  useDocumentTitle(movie.data && `${movie.data.title}, ${config.cinemaName}`)

  if (movie.isPending) return <PageState kind="loading" />
  if (movie.isError) {
    if ((movie.error as { code?: string }).code === 'NOT_FOUND') return <NotFoundPage />
    return (
      <div className="page">
        <PageState kind="error" error={movie.error} onRetry={() => movie.refetch()} />
      </div>
    )
  }

  const schedule = days
    .map((date, i) => ({
      date,
      showtimes: listings[i].data?.movies.find((m) => m.id === id)?.showtimes ?? [],
    }))
    .filter((day) => day.showtimes.length > 0)
  const loadingSchedule = listings.some((q) => q.isPending)

  return (
    <article className="page">
      <div className={styles.layout}>
        <div className={styles.poster}>
          <PosterFrame title={movie.data.title} posterUrl={movie.data.posterUrl} large />
        </div>
        <div className={styles.about}>
          <h1 className={`display ${styles.title}`}>{movie.data.title}</h1>
          <p className={styles.meta}>{movieMeta(movie.data)}</p>
          <p className={styles.description}>{movie.data.description}</p>
        </div>
        <section className={styles.schedule} aria-labelledby="showtimes">
          <h2 id="showtimes" className={styles.heading}>
            Showtimes this week
          </h2>
          {schedule.length > 0 ? (
            <ul className={styles.days}>
              {schedule.map((day) => (
                <li key={day.date} className={styles.day}>
                  <span className={styles.dayName}>{day.date === today ? 'Today' : formatDay(day.date)}</span>
                  <ul className={styles.times}>
                    {day.showtimes.map((showtime) => (
                      <TimeButton
                        key={showtime.id}
                        showtime={showtime}
                        timezone={timezone}
                        context={day.date === today ? 'Today' : formatDay(day.date)}
                        showHall
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : loadingSchedule ? (
            <p className="quiet">Loading showtimes…</p>
          ) : (
            <div>
              <p>No showtimes in the next 7 days.</p>
              <ButtonLink to="/" variant="quiet" style={{ marginTop: 'var(--space-3)' }}>
                See what’s on today
              </ButtonLink>
            </div>
          )}
        </section>
      </div>
    </article>
  )
}
