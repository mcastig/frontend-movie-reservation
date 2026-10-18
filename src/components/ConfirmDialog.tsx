import { useEffect, useId, useRef } from 'react'
import { Button } from './Button'
import styles from './ConfirmDialog.module.css'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// A modal question with two answers. The native <dialog> makes the rest of the
// page inert, keeps focus inside and closes on Escape; React stays in charge of `open`.
export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
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

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        // Escape: let the parent close it.
        event.preventDefault()
        onCancel()
      }}
      onClose={() => {
        // Closed by the browser anyway (a second Escape): keep the parent in sync.
        if (open) onCancel()
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onCancel()
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
          <div className={styles.actions}>
            <Button ref={cancelRef} variant="quiet" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
