import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError, describeError } from '../api/errors'
import { useBook, useCinemaTimezone, useSeatPlan } from '../api/hooks'
import type { SeatPlan as Plan, Seat } from '../api/types'
import { useAuth } from '../auth/context'
import { Button } from '../components/Button'
import { PageState } from '../components/PageState'
import { SeatPlan } from '../components/SeatPlan'
import { Stub } from '../components/Stub'
import { useToast } from '../components/toast-context'
import { config } from '../config'
import { useDocumentTitle, useLightsDown } from '../lib/lights'
import { formatMoney } from '../lib/money'
import { useNow } from '../lib/now'
import { joinSeats, seatCode } from '../lib/movie'
import { dateIn, formatDayOf, formatTime } from '../lib/time'
import { NotFoundPage } from './NotFound'
import styles from './Showtime.module.css'

const MAX = config.maxSeatsPerBooking

function seatIndex(plan: Plan | undefined) {
  const index = new Map<number, { seat: Seat; row: string }>()
  plan?.rows.forEach(({ row, seats }) => seats.forEach((seat) => index.set(seat.id, { seat, row })))
  return index
}

function lostMessage(codes: string[]) {
  return codes.length === 1
    ? `${codes[0]} was just booked by someone else. Pick another seat.`
    : `${joinSeats(codes)} were just booked by someone else. Pick other seats.`
}

export function ShowtimePage() {
  useLightsDown()
  const id = Number(useParams().id)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { status } = useAuth()
  const timezone = useCinemaTimezone()
  const plan = useSeatPlan(id)
  const book = useBook()
  const now = useNow()

  // Seats come back through ?seats= after signing in.
  const [selected, setSelected] = useState<number[]>(() =>
    (params.get('seats') ?? '').split(',').map(Number).filter(Boolean).slice(0, MAX),
  )
  const [notice, setNotice] = useState<string | null>(null)

  // Every new seat plan (each refetch) is checked against the picks: anything
  // someone else booked meanwhile is unselected, and named.
  const [checkedPlan, setCheckedPlan] = useState<Plan | undefined>(undefined)
  if (plan.data && plan.data !== checkedPlan) {
    setCheckedPlan(plan.data)
    const index = seatIndex(plan.data)
    const exists = selected.filter((seatId) => index.has(seatId))
    const lost = exists.filter((seatId) => !index.get(seatId)!.seat.available)
    if (lost.length || exists.length !== selected.length) {
      setSelected(exists.filter((seatId) => !lost.includes(seatId)))
    }
    if (lost.length) {
      setNotice(
        lostMessage(
          lost.map((seatId) => {
            const { seat, row } = index.get(seatId)!
            return seatCode({ row, number: seat.number })
          }),
        ),
      )
    }
  }

  const showtime = plan.data?.showtime
  useDocumentTitle(
    showtime && `${showtime.movie.title}, ${formatDayOf(showtime.startsAt, timezone)} ${formatTime(showtime.startsAt, timezone)}`,
  )

  if (plan.isPending) {
    return (
      <main className="page">
        <PageState kind="loading" message="Dimming the lights…" />
      </main>
    )
  }
  if (plan.isError || !showtime) {
    if (plan.error instanceof ApiError && plan.error.code === 'NOT_FOUND') return <NotFoundPage />
    return (
      <main className="page">
        <PageState kind="error" error={plan.error} onRetry={() => plan.refetch()} />
      </main>
    )
  }

  const index = seatIndex(plan.data)
  // Skips picks the plan doesn't have: on the render that checks a new plan,
  // `selected` still holds them until React re-renders with the cleaned list.
  const picks = selected
    .flatMap((seatId) => index.get(seatId) ?? [])
    .sort((a, b) => a.row.localeCompare(b.row) || a.seat.number - b.seat.number)
  const codes = picks.map(({ seat, row }) => seatCode({ row, number: seat.number }))
  const day = formatDayOf(showtime.startsAt, timezone)
  const time = formatTime(showtime.startsAt, timezone)
  const started = new Date(showtime.startsAt).getTime() <= now
  const date = dateIn(timezone, showtime.startsAt)
  // A preview: the total shown after booking comes from the API.
  const previewTotal = formatMoney(selected.length * showtime.priceCents)
  const label = `Book ${selected.length} ${selected.length === 1 ? 'seat' : 'seats'}, ${previewTotal}`

  const toggle = (seat: Seat) => {
    setNotice(null)
    setSelected((current) =>
      current.includes(seat.id) ? current.filter((s) => s !== seat.id) : [...current, seat.id],
    )
  }

  const submit = () => {
    if (status !== 'signedIn') {
      navigate('/signin', {
        state: { from: { pathname: `/showtimes/${id}`, search: `?seats=${selected.join(',')}` }, reason: 'book' },
      })
      return
    }
    book.mutate(
      { showtimeId: id, seatIds: selected },
      {
        onSuccess: (reservation) => {
          const when = reservation.showtime.startsAt
          setSelected([])
          toast({ message: `Booked. See you on ${formatDayOf(when, timezone)} at ${formatTime(when, timezone)}.` })
          navigate(`/bookings?booked=${reservation.id}`)
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'SEATS_TAKEN') {
            // The refetched plan unselects the lost seats and names them.
            plan.refetch()
            return
          }
          setNotice(describeError(error))
        },
      },
    )
  }

  return (
    <>
      <main id="main" className={`page ${styles.page}`}>
        <h1 className={styles.heading}>
        <Link to={date === dateIn(timezone) ? '/' : `/?date=${date}`} className={styles.back}>
          <span className={`display ${styles.title}`}>
            <span className={styles.arrow} aria-hidden="true">
              ←
            </span>
            <span>
              <span className="visually-hidden">Back to listings. </span>
              {showtime.movie.title}
            </span>
          </span>
          <span className={styles.when}>
            {day}, <strong>{time}</strong>, {showtime.hall.name}, {formatMoney(showtime.priceCents)} a seat
          </span>
        </Link>
        </h1>

        {started ? (
          <PageState
            kind="empty"
            message="This showtime has started. Pick another one."
            action={<Link to="/">See what’s on today</Link>}
          />
        ) : (
          <SeatPlan
            rows={plan.data.rows}
            selected={selected}
            atLimit={selected.length >= MAX}
            onToggle={toggle}
            onLimit={() => setNotice(`You can book up to ${MAX} seats at once.`)}
          />
        )}
      </main>

      {!started && (
        <aside className={styles.tray} aria-label="Your seats">
          <div className={`page ${styles.trayInner}`}>
            <p className={notice ? styles.message : styles.hint} role="status">
              {notice ??
                (plan.data.availableSeats === 0
                  ? 'Sold out. Pick another showtime.'
                  : selected.length === 0
                    ? `Pick up to ${MAX} seats. ${plan.data.availableSeats} free.`
                    : selected.length >= MAX
                      ? `That’s ${MAX} seats, the most for one booking.`
                      : 'Tap a stub to give the seat back.')}
            </p>
            {selected.length > 0 && (
              <div className={styles.trayRow}>
                <ul className={styles.stubs}>
                  {picks.map(({ seat }, i) => (
                    <li key={seat.id}>
                      <button
                        type="button"
                        className={styles.stubButton}
                        onClick={() => toggle(seat)}
                        aria-label={`Remove ${codes[i]}`}
                      >
                        <Stub code={codes[i]} slide>
                          <span className={styles.remove} aria-hidden="true">
                            ×
                          </span>
                        </Stub>
                      </button>
                    </li>
                  ))}
                </ul>
                <Button variant="book" className={styles.book} onClick={submit} disabled={book.isPending}>
                  {book.isPending ? 'Booking…' : label}
                </Button>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  )
}
