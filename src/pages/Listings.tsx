import { useSearchParams } from 'react-router'
import { useCinemaTimezone, useGenres, useListings } from '../api/hooks'
import { Button } from '../components/Button'
import { DateStrip } from '../components/DateStrip'
import { GenreChips } from '../components/GenreChips'
import { ListingRow } from '../components/ListingRow'
import { PageState } from '../components/PageState'
import { config } from '../config'
import { useDocumentTitle } from '../lib/lights'
import { addDays, dateIn, formatDay } from '../lib/time'
import styles from './Listings.module.css'

const DAYS = 7

export function ListingsPage() {
  const [params, setParams] = useSearchParams()
  const timezone = useCinemaTimezone()
  const today = dateIn(timezone)
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i))
  const date = days.includes(params.get('date') ?? '') ? params.get('date')! : today
  const genreId = Number(params.get('genre')) || undefined

  const listings = useListings(date)
  const genres = useGenres()

  const dayName = date === today ? 'today' : formatDay(date)
  useDocumentTitle(`What’s on ${dayName}, ${config.cinemaName}`)

  const hrefFor = (day: string) => {
    const next = new URLSearchParams(params)
    if (day === today) next.delete('date')
    else next.set('date', day)
    const query = next.toString()
    return query ? `/?${query}` : '/'
  }

  const setGenre = (id: number | undefined) => {
    const next = new URLSearchParams(params)
    if (id) next.set('genre', String(id))
    else next.delete('genre')
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const movies = (listings.data?.movies ?? []).filter(
    (movie) => !genreId || movie.genres.some((g) => g.id === genreId),
  )
  const genreName = genres.data?.find((g) => g.id === genreId)?.name

  return (
    <div className={`page ${styles.page}`}>
      <h1 className="visually-hidden">What’s on {dayName}</h1>
      <div className={styles.controls}>
        <DateStrip days={days} selected={date} hrefFor={hrefFor} />
        {genres.data && genres.data.length > 0 && (
          <GenreChips genres={genres.data} selected={genreId} onChange={setGenre} />
        )}
      </div>

      {listings.isPending ? (
        <PageState kind="loading" />
      ) : listings.isError ? (
        <PageState kind="error" error={listings.error} onRetry={() => listings.refetch()} />
      ) : movies.length === 0 ? (
        genreName ? (
          <PageState
            kind="empty"
            message={`No ${genreName} showing on ${formatDay(date)}. Try another day or genre.`}
            action={
              <Button variant="quiet" onClick={() => setGenre(undefined)}>
                Show every genre
              </Button>
            }
          />
        ) : (
          <PageState kind="empty" message={`Nothing showing on ${formatDay(date)}. Try another day.`} />
        )
      ) : (
        <ul className={`panel ${styles.list}`}>
          {movies.map((movie) => (
            <ListingRow key={movie.id} movie={movie} timezone={listings.data.timezone} />
          ))}
        </ul>
      )}
    </div>
  )
}
