import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { SeatPlan as Plan, Seat } from '../api/types'
import styles from './SeatPlan.module.css'

interface Props {
  rows: Plan['rows']
  selected: number[]
  // Picks are capped (10 per booking); free seats stay focusable but can't be added.
  atLimit: boolean
  onToggle: (seat: Seat, row: string) => void
  onLimit: () => void
}

// How far a seat rises toward the screen: 0 in the middle of the row, most at the ends.
function lift(index: number, count: number) {
  const center = (count - 1) / 2
  if (center === 0) return '0px'
  const distance = (index - center) / center
  return `${(-distance * distance * 0.6).toFixed(3)}rem`
}

export function SeatPlan({ rows, selected, atLimit, onToggle, onLimit }: Props) {
  const cols = Math.max(...rows.map((r) => r.seats.length))
  const seatRefs = useRef(new Map<number, HTMLButtonElement>())
  const available = rows.map((r) => r.seats.filter((s) => s.available))
  const allAvailable = available.flat()

  // Roving tabindex: one seat is in the tab order, arrow keys move between free seats.
  const [focusedId, setFocusedId] = useState<number | null>(null)
  const current =
    allAvailable.find((s) => s.id === focusedId)?.id ??
    allAvailable.find((s) => selected.includes(s.id))?.id ??
    allAvailable[0]?.id

  const moveTo = (seat: Seat | undefined) => {
    if (!seat) return
    setFocusedId(seat.id)
    seatRefs.current.get(seat.id)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const rowIndex = available.findIndex((r) => r.some((s) => s.id === current))
    if (rowIndex < 0) return
    const row = available[rowIndex]
    const seat = row.find((s) => s.id === current)!
    const index = row.indexOf(seat)

    const nearestIn = (step: 1 | -1) => {
      for (let r = rowIndex + step; r >= 0 && r < available.length; r += step) {
        if (available[r].length === 0) continue
        return available[r].reduce((best, s) =>
          Math.abs(s.number - seat.number) < Math.abs(best.number - seat.number) ? s : best,
        )
      }
      return undefined
    }

    const targets: Record<string, () => Seat | undefined> = {
      ArrowLeft: () => row[index - 1],
      ArrowRight: () => row[index + 1],
      ArrowUp: () => nearestIn(-1),
      ArrowDown: () => nearestIn(1),
      Home: () => row[0],
      End: () => row.at(-1),
    }
    const target = targets[event.key]
    if (!target) return
    event.preventDefault()
    moveTo(target())
  }

  return (
    <div className={styles.hall} style={{ '--cols': cols } as CSSProperties}>
      <div className={styles.screen} aria-hidden="true">
        <svg className={styles.arc} viewBox="0 0 300 40" preserveAspectRatio="none">
          <path className={styles.arcGlow} d="M6 34 Q150 -2 294 34 L270 40 Q150 14 30 40 Z" />
          <path className={styles.arcLine} d="M6 34 Q150 -2 294 34" />
        </svg>
        <span className={styles.screenLabel}>Screen</span>
      </div>

      <div className={styles.rows} role="group" aria-label="Seats" onKeyDown={onKeyDown}>
        {rows.map(({ row, seats }) => (
          <div key={row} className={styles.row} role="group" aria-label={`Row ${row}`}>
            <span className={styles.rowLabel} aria-hidden="true">
              {row}
            </span>
            {seats.map((seat, index) => {
              const picked = selected.includes(seat.id)
              const blocked = atLimit && !picked && seat.available
              return (
                <button
                  key={seat.id}
                  ref={(el) => {
                    if (el) seatRefs.current.set(seat.id, el)
                    else seatRefs.current.delete(seat.id)
                  }}
                  type="button"
                  className={styles.seat}
                  style={{ '--lift': lift(index, seats.length) } as CSSProperties}
                  disabled={!seat.available}
                  aria-pressed={seat.available ? picked : undefined}
                  aria-disabled={blocked || undefined}
                  aria-label={`Row ${row}, seat ${seat.number}, ${seat.available ? 'available' : 'taken'}`}
                  tabIndex={seat.id === current ? 0 : -1}
                  onFocus={() => setFocusedId(seat.id)}
                  onClick={() => (blocked ? onLimit() : onToggle(seat, row))}
                >
                  {seat.available ? seat.number : '✕'}
                </button>
              )
            })}
            <span className={styles.rowLabel} aria-hidden="true">
              {row}
            </span>
          </div>
        ))}
      </div>

      <ul className={styles.legend} aria-label="Key">
        <li>
          <span className={styles.key} aria-hidden="true" /> Free
        </li>
        <li>
          <span className={`${styles.key} ${styles.keyPicked}`} aria-hidden="true" /> Yours
        </li>
        <li>
          <span className={`${styles.key} ${styles.keyTaken}`} aria-hidden="true">
            ✕
          </span>{' '}
          Taken
        </li>
      </ul>
    </div>
  )
}
