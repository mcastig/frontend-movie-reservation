import type { Genre } from '../api/types'
import styles from './GenreChips.module.css'

interface Props {
  genres: Genre[]
  selected: number | undefined
  onChange: (genreId: number | undefined) => void
}

export function GenreChips({ genres, selected, onChange }: Props) {
  return (
    <ul className={styles.chips} aria-label="Filter by genre">
      {genres.map((genre) => {
        const pressed = genre.id === selected
        return (
          <li key={genre.id}>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={pressed}
              onClick={() => onChange(pressed ? undefined : genre.id)}
            >
              {genre.name}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
