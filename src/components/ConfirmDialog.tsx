import { useEffect, useId, useRef } from 'react'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'
import { Spinner } from './Spinner'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  // A confirm that can't be undone (cancelling a booking) gets the red button.
  danger?: boolean
  // While the answer is being carried out: a spinner, both answers locked.
  pending?: boolean
  pendingLabel?: string
  // Why carrying it out failed, shown in the dialog.
  error?: string
}

// A modal question with two answers. The native <dialog> makes the rest of the
// page inert, keeps focus inside and closes on Escape; React stays in charge of `open`.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger,
  pending,
  pendingLabel,
  error,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) {
      dialog.showModal()
      // Start on the safe answer.
      cancelRef.current!.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Nothing closes the dialog halfway through carrying out the answer.
  const dismiss = () => {
    if (!pending) onCancel()
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        // Escape: let the parent close it.
        event.preventDefault()
        dismiss()
      }}
      onClose={() => {
        // Closed by the browser anyway (a second Escape): keep the parent in sync.
        if (open) onCancel()
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) dismiss()
      }}
    >
      {open && (
        <div className={styles.body}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p id={messageId} className={styles.message}>
            {message}
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button ref={cancelRef} variant="quiet" onClick={dismiss} disabled={pending}>
              {cancelLabel}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending}>
              {pending ? (
                <>
                  <Spinner />
                  <span className="visually-hidden">{pendingLabel ?? confirmLabel}</span>
                </>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
