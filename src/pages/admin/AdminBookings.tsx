import { useState, type FormEvent } from 'react'
import { useAdminBookings, useCinemaTimezone, type AdminBookingFilters } from '../../api/hooks'
import { Button } from '../../components/Button'
import { Field, TextField } from '../../components/Field'
import { PageState } from '../../components/PageState'
import { formatMoney } from '../../lib/money'
import { seatCode } from '../../lib/movie'
import { dateIn, endOfDayIso, formatDay, formatTime, startOfDayIso } from '../../lib/time'
import styles from './admin.module.css'

export function AdminBookingsPage() {
  const timezone = useCinemaTimezone()
  const [filters, setFilters] = useState<AdminBookingFilters>({ page: 1 })
  const bookings = useAdminBookings(filters)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const from = String(form.get('from'))
    const to = String(form.get('to'))
    const status = String(form.get('status'))
    setFilters({
      page: 1,
      showtimeId: Number(form.get('showtimeId')) || undefined,
      status: status === 'confirmed' || status === 'cancelled' ? status : undefined,
      from: from ? startOfDayIso(from, timezone) : undefined,
      to: to ? endOfDayIso(to, timezone) : undefined,
    })
  }

  const pagination = bookings.data?.pagination

  return (
    <section className={styles.section} aria-labelledby="bookings-title">
      <h1 id="bookings-title" className={styles.title}>
        Bookings
      </h1>
      <form className={styles.inline} onSubmit={onSubmit}>
        <TextField label="Showtime number" name="showtimeId" type="number" min={1} inputMode="numeric" />
        <Field label="Status">
          {(control) => (
            <select name="status" {...control}>
              <option value="">Any</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}
        </Field>
        <TextField label="Showtimes from" name="from" type="date" />
        <TextField label="To" name="to" type="date" />
        <Button type="submit">Show bookings</Button>
      </form>

      {bookings.isPending ? (
        <PageState kind="loading" />
      ) : bookings.isError ? (
        <PageState kind="error" error={bookings.error} onRetry={() => bookings.refetch()} />
      ) : bookings.data.data.length === 0 ? (
        <PageState kind="empty" message="No bookings match these filters." />
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Booking</th>
                  <th scope="col">Guest</th>
                  <th scope="col">Showtime</th>
                  <th scope="col">Seats</th>
                  <th scope="col" className={styles.num}>
                    Total
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Booked</th>
                </tr>
              </thead>
              <tbody>
                {bookings.data.data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>
                      {r.user.name}
                      <br />
                      <span className="quiet">{r.user.email}</span>
                    </td>
                    <td>
                      {r.showtime.movie.title}
                      <br />
                      <span className="quiet">
                        {formatDay(dateIn(timezone, r.showtime.startsAt))} {formatTime(r.showtime.startsAt, timezone)},{' '}
                        {r.showtime.hall.name}, no. {r.showtime.id}
                      </span>
                    </td>
                    <td>{r.seats.map(seatCode).join(', ')}</td>
                    <td className={styles.num}>{formatMoney(r.totalCents)}</td>
                    <td>{r.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}</td>
                    <td>
                      {formatDay(dateIn(timezone, r.createdAt))} {formatTime(r.createdAt, timezone)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pager}>
              <Button
                variant="quiet"
                small
                disabled={pagination.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              >
                Previous page
              </Button>
              <span>
                Page {pagination.page} of {pagination.totalPages}, {pagination.total} bookings
              </span>
              <Button
                variant="quiet"
                small
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              >
                Next page
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
