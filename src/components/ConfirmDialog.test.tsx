import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function setup(open = true) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const props = {
    title: 'Sign out?',
    message: 'You’ll need to sign in again.',
    confirmLabel: 'Sign out',
    cancelLabel: 'Stay signed in',
    onConfirm,
    onCancel,
  }
  const view = render(<ConfirmDialog open={open} {...props} />)
  const dialog = view.container.querySelector('dialog')!
  return { ...view, dialog, onConfirm, onCancel, reopen: (next: boolean) => view.rerender(<ConfirmDialog open={next} {...props} />) }
}

describe('ConfirmDialog', () => {
  it('opens as a modal, named by its title and described by its message', () => {
    const { dialog } = setup()
    expect(dialog.open).toBe(true)
    expect(screen.getByRole('dialog', { name: 'Sign out?' })).toHaveAccessibleDescription('You’ll need to sign in again.')
    expect(screen.getByRole('button', { name: 'Stay signed in' })).toHaveFocus()
  })

  it('stays closed and empty until asked', () => {
    const { dialog, reopen } = setup(false)
    expect(dialog.open).toBe(false)
    expect(dialog).toBeEmptyDOMElement()

    reopen(true)
    expect(dialog.open).toBe(true)
    reopen(true)
    expect(dialog.open).toBe(true)
    reopen(false)
    expect(dialog.open).toBe(false)
  })

  it('answers with either button', async () => {
    const { onConfirm, onCancel } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Stay signed in' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on Escape, leaving the closing to the parent', () => {
    const { dialog, onCancel } = setup()
    const escape = new Event('cancel', { cancelable: true })
    fireEvent(dialog, escape)
    expect(escape.defaultPrevented).toBe(true)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels when the browser closes it anyway', () => {
    const { dialog, onCancel, reopen } = setup()
    dialog.close()
    expect(onCancel).toHaveBeenCalledTimes(1)

    // Closed by the parent: nothing to report.
    reopen(true)
    reopen(false)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on a backdrop click, not on a click inside', async () => {
    const { dialog, onCancel } = setup()
    await userEvent.click(screen.getByText('You’ll need to sign in again.'))
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.click(dialog)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
