import { useState } from 'react'
import { describeError } from '../api/errors'
import { useCancelBooking, useCinemaTimezone, useMyBookings } from '../api/hooks'
import type { Reservation } from '../api/types'
import { useAuth } from '../auth/context'
import { Button, ButtonLink } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageState } from '../components/PageState'
import { Ticket } from '../components/Ticket'
import { useToast } from '../components/toast-context'
import { useDocumentTitle } from '../lib/lights'
import { joinSeats, seatCode } from '../lib/movie'
import { useNow } from '../lib/now'
import styles from './Bookings.module.css'

const startsIn = (r: Reservation, now: number) => new Date(r.showtime.startsAt).getTime() - now

export function BookingsPage() {
  useDocumentTitle('My bookings')
  const { status } = useAuth()
  const bookings = useMyBookings(status === 'signedIn')
  const timezone = useCinemaTimezone()
  const now = useNow()

  if (bookings.isPending) return <PageState kind="loading" />
  if (bookings.isError) {
    return (
      <div className="page">
        <PageState kind="error" error={bookings.error} onRetry={() => bookings.refetch()} />
      </div>
    )
  }

  const all = bookings.data.data
  const upcoming = all
    .filter((r) => r.status === 'confirmed' && startsIn(r, now) > 0)
    .sort((a, b) => startsIn(a, now) - startsIn(b, now))
  const earlier = all
    .filter((r) => !upcoming.includes(r))
    .sort((a, b) => startsIn(b, now) - startsIn(a, now))

  return (
    <div className={`page ${styles.wrap}`}>
      <h1 className="page-title">My bookings</h1>

      <section className={styles.section} aria-labelledby="upcoming">
        <h2 id="upcoming" className={styles.heading}>
          Coming up
        </h2>
        {upcoming.length ? (
          <ul className={styles.list}>
            {upcoming.map((r) => (
              <li key={r.id} className={styles.item}>
                <Ticket reservation={r} timezone={timezone} />
                <CancelBooking reservation={r} />
              </li>
            ))}
          </ul>
        ) : (
          <PageState
            kind="empty"
            message="No upcoming bookings."
            action={<ButtonLink to="/">See what’s on today</ButtonLink>}
          />
        )}
      </section>

      {earlier.length > 0 && (
        <section className={styles.section} aria-labelledby="earlier">
          <h2 id="earlier" className={styles.heading}>
            Past and cancelled
          </h2>
          <ul className={styles.list}>
            {earlier.map((r) => (
              <li key={r.id}>
                <Ticket reservation={r} timezone={timezone} status={r.status === 'cancelled' ? 'Cancelled' : 'Past'} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function CancelBooking({ reservation }: { reservation: Reservation }) {
  const [confirming, setConfirming] = useState(false)
  const cancel = useCancelBooking()
  const toast = useToast()
  const seats = joinSeats(reservation.seats.map(seatCode))
  const plural = reservation.seats.length > 1

  return (
    <>
      <Button
        variant="quiet"
        small
        onClick={() => {
          cancel.reset()
          setConfirming(true)
        }}
      >
        Cancel booking
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`Cancel ${reservation.showtime.movie.title}?`}
        message={`${plural ? 'Seats' : 'Seat'} ${seats} will go back on sale. This can’t be undone.`}
        confirmLabel="Yes, cancel booking"
        cancelLabel="Keep booking"
        danger
        pending={cancel.isPending}
        pendingLabel="Cancelling…"
        error={cancel.isError ? describeError(cancel.error) : undefined}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          cancel.mutate(reservation.id, {
            onSuccess: () => {
              setConfirming(false)
              toast({
                message: `Booking cancelled. ${plural ? 'Seats' : 'Seat'} ${seats} ${plural ? 'are' : 'is'} free again.`,
              })
            },
          })
        }
      />
    </>
  )
}
