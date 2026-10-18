import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Field.module.css'

export interface ControlProps {
  id: string
  className: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

interface FieldProps {
  label: string
  // From VALIDATION_ERROR.details, matched by path.
  error?: string
  hint?: ReactNode
  children: (control: ControlProps) => ReactNode
}

export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({ id, className: styles.control, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {error && (
        <p className={styles.error} id={errorId}>
          {error}
        </p>
      )}
      {hint && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function TextField({
  label,
  error,
  hint,
  ...input
}: Omit<FieldProps, 'children'> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(control) => <input {...input} {...control} />}
    </Field>
  )
}
