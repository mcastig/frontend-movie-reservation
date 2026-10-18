import { useState } from 'react'
import { ApiError } from '../api/errors'
import type { Reservation, SeatPlan as Plan } from '../api/types'
import { Button } from '../components/Button'
import { TextField } from '../components/Field'
import { PageState } from '../components/PageState'
import { PosterFrame } from '../components/PosterFrame'
import { SeatPlan } from '../components/SeatPlan'
import { Stub } from '../components/Stub'
import { Ticket } from '../components/Ticket'
import { TimeButton } from '../components/TimeButton'
import { Toast } from '../components/Toast'
import { useDocumentTitle } from '../lib/lights'
import styles from './Styleguide.module.css'

// Dev-only: every component in both lighting states, for keyboard and axe checks.

const palette = [
  ['Screen silver', '--screen-silver'],
  ['House navy', '--house-navy'],
  ['Seat rose', '--seat-rose'],
  ['Usher grey', '--usher-grey'],
  ['Velvet slate', '--velvet-slate'],
  ['Screen glow', '--screen-glow'],
  ['Alarm red', '--alarm-red'],
  ['Alarm red, dark', '--alarm-red-dark'],
]

const showtime = (id: number, hour: number, seatsAvailable: number) => ({
  id,
  startsAt: `2026-10-20T${hour}:00:00.000Z`,
  endsAt: `2026-10-20T${hour + 2}:43:00.000Z`,
  priceCents: 1200,
  seatsAvailable,
  hall: { id: 1, name: 'Hall 1' },
})

const rows: Plan['rows'] = ['A', 'B', 'C'].map((row, r) => ({
  row,
  seats: Array.from({ length: 8 }, (_, i) => ({ id: r * 8 + i + 1, number: i + 1, available: !(r === 0 && i > 5) })),
}))

const reservation: Reservation = {
  id: 1,
  userId: 1,
  status: 'confirmed',
  totalCents: 2400,
  createdAt: '2026-10-18T10:00:00.000Z',
  cancelledAt: null,
  showtime: {
    id: 1,
    startsAt: '2026-10-20T14:00:00.000Z',
    endsAt: '2026-10-20T16:43:00.000Z',
    movie: { id: 1, title: 'Inception' },
    hall: { id: 1, name: 'Hall 1' },
  },
  seats: [
    { id: 11, row: 'B', number: 3, priceCents: 1200 },
    { id: 12, row: 'B', number: 4, priceCents: 1200 },
  ],
}

function Panel({ lights }: { lights: 'up' | 'down' }) {
  const [selected, setSelected] = useState<number[]>([11, 12])
  return (
    <section className={styles.panel} data-lights={lights} aria-label={`House lights ${lights}`}>
      <h2 className="page-title">House lights {lights}</h2>

      <div className={styles.group}>
        <p className={styles.label}>Type</p>
        <div className={styles.type}>
          <p className="display" style={{ fontSize: 'var(--step-5)' }}>
            Spirited Away
          </p>
          <p className="display" style={{ fontSize: 'var(--step-4)' }}>
            The Grand Budapest Hotel
          </p>
          <p>Body text in Atkinson Hyperlegible Next, 16 px on a 1.5 line height. 2 h 5 min, Animation, Drama.</p>
          <p className="quiet">Secondary text. $12.00 a seat, 38 left.</p>
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Buttons</p>
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="quiet">Quiet</Button>
          <Button variant="danger">Yes, cancel booking</Button>
          <Button disabled>Disabled</Button>
          <Button variant="book">Book 2 seats, $24.00</Button>
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Time buttons</p>
        <ul className={styles.row}>
          <TimeButton showtime={showtime(1, 14, 38)} timezone="UTC" context="Inception" />
          <TimeButton showtime={showtime(2, 20, 0)} timezone="UTC" context="Inception" />
          <TimeButton showtime={showtime(3, 17, 4)} timezone="UTC" context="Inception" showHall />
        </ul>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Fields</p>
        <TextField label="Email" type="email" defaultValue="ana@example.com" />
        <TextField label="Password" type="password" error="Must be at least 8 characters." />
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Toasts</p>
        <Toast message="Booked. See you on Tue 20 at 14:00." onClose={() => {}} />
        <Toast message="Too many attempts. Try again in 12 minutes." tone="error" />
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Stubs and tickets</p>
        <div className={styles.row}>
          <Stub code="B3" />
          <Stub code="B4" />
        </div>
        <Ticket reservation={reservation} timezone="UTC" />
        <Ticket reservation={{ ...reservation, status: 'cancelled' }} timezone="UTC" status="Cancelled" />
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Poster frames: missing poster, broken URL</p>
        <div className={styles.row}>
          <div className={styles.poster}>
            <PosterFrame title="Inception" posterUrl={null} />
          </div>
          <div className={styles.poster}>
            <PosterFrame title="The Grand Budapest Hotel" posterUrl="https://example.com/missing.jpg" />
          </div>
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Page states</p>
        <PageState kind="loading" message="Opening the box office…" />
        <PageState kind="empty" message="Nothing showing on Wed 21. Try another day." />
        <PageState
          kind="error"
          error={new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: '', requestId: 'req_8f2c1a' })}
          onRetry={() => {}}
        />
      </div>

      {lights === 'down' && (
        <div className={styles.group}>
          <p className={styles.label}>Seat plan</p>
          <SeatPlan
            rows={rows}
            selected={selected}
            atLimit={false}
            onToggle={(seat) =>
              setSelected((s) => (s.includes(seat.id) ? s.filter((x) => x !== seat.id) : [...s, seat.id]))
            }
            // Never at the limit here, so this never runs.
            /* v8 ignore next */
            onLimit={() => {}}
          />
        </div>
      )}
    </section>
  )
}

export function StyleguidePage() {
  useDocumentTitle('Style guide')
  return (
    <div className={`page ${styles.panels}`}>
      <h1 className="page-title">Style guide</h1>
      <ul className={styles.swatches}>
        {palette.map(([name, token]) => (
          <li key={token} className={styles.swatch}>
            <span className={styles.chip} style={{ background: `var(${token})` }} />
            {name}
          </li>
        ))}
      </ul>
      <Panel lights="up" />
      <Panel lights="down" />
    </div>
  )
}
