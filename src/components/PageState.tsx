import type { ReactNode } from 'react'
import { describeError } from '../api/errors'
import { Button } from './Button'
import styles from './PageState.module.css'

type Props =
  | { kind: 'loading'; message?: string }
  | { kind: 'empty'; message: string; action?: ReactNode }
  | { kind: 'error'; error: unknown; onRetry?: () => void; action?: ReactNode }

export function PageState(props: Props) {
  if (props.kind === 'loading') {
    return (
      <div className={styles.state} role="status">
        <p className={`${styles.message} ${styles.loading}`}>{props.message ?? 'Loading…'}</p>
      </div>
    )
  }
  if (props.kind === 'empty') {
    return (
      <div className={styles.state}>
        <p className={styles.message}>{props.message}</p>
        {props.action}
      </div>
    )
  }
  return (
    <div className={styles.state} role="alert">
      <p className={`${styles.message} ${styles.error}`}>{describeError(props.error)}</p>
      {props.onRetry && (
        <Button variant="quiet" onClick={props.onRetry}>
          Try again
        </Button>
      )}
      {props.action}
    </div>
  )
}
