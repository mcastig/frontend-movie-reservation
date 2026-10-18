import { useState, type FormEvent } from 'react'
import { useCinemaTimezone, useMovieReport, useShowtimeReport } from '../../api/hooks'
import { Button } from '../../components/Button'
import { TextField } from '../../components/Field'
import { PageState } from '../../components/PageState'
import { formatMoney } from '../../lib/money'
import { addDays, dateIn, endOfDayIso, formatDay, formatTime, startOfDayIso } from '../../lib/time'
import styles from './admin.module.css'

const percent = (value: number) => `${Math.round(value)}%`

function Occupancy({ pct }: { pct: number }) {
  return (
    <span className={styles.occupancy}>
      <span className={styles.bar} aria-hidden="true">
        <span className={styles.barFill} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
      {percent(pct)}
    </span>
  )
}

export function AdminReportsPage() {
  const timezone = useCinemaTimezone()
  const today = dateIn(timezone)
  const [days, setDays] = useState({ from: addDays(today, -30), to: addDays(today, 7) })
  const range = { from: startOfDayIso(days.from, timezone), to: endOfDayIso(days.to, timezone) }
  const showtimes = useShowtimeReport(range)
  const movies = useMovieReport(range)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const from = String(form.get('from'))
    const to = String(form.get('to'))
    if (from && to) setDays(from <= to ? { from, to } : { from: to, to: from })
  }

  return (
    <section className={styles.section} aria-labelledby="reports-title">
      <h1 id="reports-title" className={styles.title}>
        Reports
      </h1>
      <form className={styles.inline} onSubmit={onSubmit}>
        <TextField label="From" name="from" type="date" defaultValue={days.from} required />
        <TextField label="To" name="to" type="date" defaultValue={days.to} required />
        <Button type="submit">Show report</Button>
      </form>
      <p className={styles.note}>
        Showtimes starting {formatDay(days.from)} to {formatDay(days.to)}, in {timezone}.
      </p>

      {showtimes.isPending ? (
        <PageState kind="loading" />
      ) : showtimes.isError ? (
        <PageState kind="error" error={showtimes.error} onRetry={() => showtimes.refetch()} />
      ) : (
        <>
          <dl className={styles.totals}>
            <div>
              <dt>Revenue</dt>
              <dd>{formatMoney(showtimes.data.totals.revenueCents)}</dd>
            </div>
            <div>
              <dt>Tickets sold</dt>
              <dd>
                {showtimes.data.totals.ticketsSold} of {showtimes.data.totals.capacity}
              </dd>
            </div>
            <div>
              <dt>Occupancy</dt>
              <dd>{percent(showtimes.data.totals.occupancyPct)}</dd>
            </div>
            <div>
              <dt>Showtimes</dt>
              <dd>{showtimes.data.totals.showtimes}</dd>
            </div>
            <div>
              <dt>Cancelled bookings</dt>
              <dd>{showtimes.data.totals.cancelledReservations}</dd>
            </div>
          </dl>

          <h2 className={styles.subtitle}>By showtime</h2>
          {showtimes.data.showtimes.length === 0 ? (
            <PageState kind="empty" message="No showtimes in this range. Try a wider range." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Showtime</th>
                    <th scope="col">Movie</th>
                    <th scope="col">Hall</th>
                    <th scope="col">Occupancy</th>
                    <th scope="col" className={styles.num}>
                      Sold
                    </th>
                    <th scope="col" className={styles.num}>
                      Revenue
                    </th>
                    <th scope="col" className={styles.num}>
                      Cancelled
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {showtimes.data.showtimes.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {formatDay(dateIn(timezone, s.startsAt))} {formatTime(s.startsAt, timezone)}
                      </td>
                      <td>{s.movie.title}</td>
                      <td>{s.hall.name}</td>
                      <td>
                        <Occupancy pct={s.occupancyPct} />
                      </td>
                      <td className={styles.num}>
                        {s.ticketsSold} of {s.capacity}
                      </td>
                      <td className={styles.num}>{formatMoney(s.revenueCents)}</td>
                      <td className={styles.num}>{s.cancelledReservations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <h2 className={styles.subtitle}>By movie</h2>
      {movies.isPending ? (
        <PageState kind="loading" />
      ) : movies.isError ? (
        <PageState kind="error" error={movies.error} onRetry={() => movies.refetch()} />
      ) : movies.data.movies.length === 0 ? (
        <PageState kind="empty" message="No tickets sold in this range." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Movie</th>
                <th scope="col" className={styles.num}>
                  Tickets sold
                </th>
                <th scope="col" className={styles.num}>
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {movies.data.movies.map((m) => (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td className={styles.num}>{m.ticketsSold}</td>
                  <td className={styles.num}>{formatMoney(m.revenueCents)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className={styles.num}>{movies.data.totals.ticketsSold}</td>
                <td className={styles.num}>{formatMoney(movies.data.totals.revenueCents)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
