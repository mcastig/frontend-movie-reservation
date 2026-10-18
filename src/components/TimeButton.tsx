import { Link } from 'react-router'
import type { ListingShowtime } from '../api/types'
import { formatTime } from '../lib/time'
import styles from './TimeButton.module.css'

interface Props {
  showtime: ListingShowtime
  timezone: string
  // Spoken before the time, so "14:00" makes sense out of context.
  context: string
  showHall?: boolean
}

export function TimeButton({ showtime, timezone, context, showHall }: Props) {
  const time = formatTime(showtime.startsAt, timezone)
  const soldOut = showtime.seatsAvailable === 0
  const left = soldOut ? 'Sold out' : `${showtime.seatsAvailable} left`

  return (
    <li className={styles.item}>
      {soldOut ? (
        <span className={`${styles.time} ${styles.soldOut}`} aria-disabled="true">
          <span className="visually-hidden">{context}, </span>
          {time}
        </span>
      ) : (
        <Link
          className={styles.time}
          to={`/showtimes/${showtime.id}`}
          aria-label={`${context}, ${time}, ${showtime.hall.name}, ${left}`}
        >
          {time}
        </Link>
      )}
      <span className={styles.left} aria-hidden={!soldOut}>
        {left}
      </span>
      {showHall && (
        <span className={styles.hall} aria-hidden="true">
          {showtime.hall.name}
        </span>
      )}
    </li>
  )
}
