import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Toast, ToastProvider } from './Toast'
import { useToast, type ToastInput } from './toast-context'

function setup() {
  let show!: (toast: ToastInput) => void
  function Trigger() {
    show = useToast()
    return null
  }
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  )
  return { show: (toast: ToastInput) => act(() => show(toast)) }
}

const region = () => screen.getByRole('status')

describe('Toast', () => {
  it('is dismissible only with a close handler', async () => {
    const onClose = vi.fn()
    const { rerender, container } = render(<Toast message="Booked." onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onClose).toHaveBeenCalled()
    expect((container.firstChild as HTMLElement).className).not.toMatch(/error/)

    rerender(<Toast message="Too many attempts." tone="error" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect((container.firstChild as HTMLElement).className).toMatch(/error/)
  })
})

describe('ToastProvider', () => {
  it('announces toasts politely and dismisses them after 7 seconds', () => {
    vi.useFakeTimers()
    const { show } = setup()
    expect(region()).toHaveAttribute('aria-live', 'polite')

    show({ message: 'Booked.' })
    expect(region()).toHaveTextContent('Booked.')
    act(() => vi.advanceTimersByTime(6999))
    expect(region()).toHaveTextContent('Booked.')
    act(() => vi.advanceTimersByTime(1))
    expect(region()).toBeEmptyDOMElement()
  })

  it('keeps the three newest', () => {
    const { show } = setup()
    ;['one', 'two', 'three', 'four'].forEach((message) => show({ message }))
    expect(region()).toHaveTextContent(/^two×three×four×$/)
  })

  it('closes a toast on request', async () => {
    const { show } = setup()
    show({ message: 'First' })
    show({ message: 'Second', tone: 'error' })
    await userEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0])
    expect(region()).toHaveTextContent(/^Second×$/)
  })

  it('needs the provider', () => {
    function Lonely() {
      useToast()
      return null
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Lonely />)).toThrow('useToast needs <ToastProvider>')
  })
})
