import type { Reservation } from '../api/types'
import { formatMoney } from '../lib/money'
import { seatCode } from '../lib/movie'
import { dateIn, formatDayMonth, formatTime } from '../lib/time'
import styles from './Ticket.module.css'

interface Props {
  reservation: Reservation
  timezone: string
  // Past or cancelled: shown dimmed, with a status.
  status?: 'Past' | 'Cancelled'
}

export function Ticket({ reservation, timezone, status }: Props) {
  const { showtime } = reservation
  const codes = reservation.seats
    .slice()
    .sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)
    .map(seatCode)

  return (
    <article className={`${styles.ticket} ${status ? styles.dim : ''}`} aria-labelledby={`ticket-${reservation.id}`}>
      <div className={styles.main}>
        {status && <span className={styles.status}>{status}</span>}
        <h3 id={`ticket-${reservation.id}`} className={`display ${styles.title}`}>
          {showtime.movie.title}
        </h3>
        <p className={styles.when}>
          {formatDayMonth(dateIn(timezone, showtime.startsAt))}, {formatTime(showtime.startsAt, timezone)}
        </p>
        <p className={styles.hall}>{showtime.hall.name}</p>
      </div>
      <div className={styles.side}>
        <p>
          <span className={styles.label}>{codes.length === 1 ? 'Seat' : 'Seats'}</span>
          <span className={styles.seats}>{codes.join(' ')}</span>
        </p>
        <p>
          <span className={styles.label}>Total</span>
          <span className={styles.total}>{formatMoney(reservation.totalCents)}</span>
        </p>
      </div>
    </article>
  )
}
