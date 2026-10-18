import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { formatDay } from '../lib/time'
import styles from './DateStrip.module.css'

interface Props {
  days: string[]
  selected: string
  // The link for a day, so each day is shareable.
  hrefFor: (day: string) => string
}

export function DateStrip({ days, selected, hrefFor }: Props) {
  const current = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    current.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected])

  return (
    <nav aria-label="Day">
      <ul className={styles.strip}>
        {days.map((day, index) => (
          <li key={day}>
            <Link
              ref={day === selected ? current : undefined}
              className={styles.day}
              to={hrefFor(day)}
              aria-current={day === selected ? 'date' : undefined}
              replace
              preventScrollReset
            >
              {index === 0 ? 'Today' : formatDay(day)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
