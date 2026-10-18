import styles from './Spinner.module.css'

// A turning ring in the current text color, sized by font-size. Decorative:
// pair it with text for screen readers.
export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />
}
