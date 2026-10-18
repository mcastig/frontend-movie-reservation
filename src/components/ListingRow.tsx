import { Link } from 'react-router'
import type { Listings } from '../api/types'
import { movieMeta } from '../lib/movie'
import styles from './ListingRow.module.css'
import { PosterFrame } from './PosterFrame'
import { TimeButton } from './TimeButton'

interface Props {
  movie: Listings['movies'][number]
  timezone: string
}

export function ListingRow({ movie, timezone }: Props) {
  const showHalls = new Set(movie.showtimes.map((s) => s.hall.id)).size > 1

  return (
    <li className={styles.row}>
      <Link to={`/movies/${movie.id}`} className={styles.poster} tabIndex={-1} aria-hidden="true">
        <PosterFrame title={movie.title} posterUrl={movie.posterUrl} />
      </Link>
      <div className={styles.body}>
        <h2 className={`display ${styles.title}`}>
          <Link to={`/movies/${movie.id}`}>{movie.title}</Link>
        </h2>
        <p className={styles.meta}>{movieMeta(movie)}</p>
        <ul className={styles.times} aria-label={`Showtimes for ${movie.title}`}>
          {movie.showtimes.map((showtime) => (
            <TimeButton
              key={showtime.id}
              showtime={showtime}
              timezone={timezone}
              context={movie.title}
              showHall={showHalls}
            />
          ))}
        </ul>
      </div>
    </li>
  )
}
