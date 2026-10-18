import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { config } from '../config'
import { json } from '../test/api'
import { BootGate } from './BootGate'

const flush = () => act(() => vi.advanceTimersByTimeAsync(0))

describe('BootGate', () => {
  it('shows the app as soon as the API answers', async () => {
    vi.useFakeTimers()
    const health = vi.fn(async () => json(200, { status: 'ok' }))
    vi.stubGlobal('fetch', health)

    const { container } = render(<BootGate>App</BootGate>)
    expect(container).toBeEmptyDOMElement()
    await flush()
    expect(screen.getByText('App')).toBeInTheDocument()
    expect(health).toHaveBeenCalledWith(`${config.apiUrl}/health`)

    // The wake-up notice never shows once the app is up.
    await act(() => vi.advanceTimersByTimeAsync(config.wakeUpNoticeMs))
    expect(screen.getByText('App')).toBeInTheDocument()
  })

  it('says the box office is opening while the API wakes up, and retries', async () => {
    vi.useFakeTimers()
    const health = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(json(503))
      .mockResolvedValue(json(200))
    vi.stubGlobal('fetch', health)

    render(<BootGate>App</BootGate>)
    await act(() => vi.advanceTimersByTimeAsync(config.wakeUpNoticeMs))
    expect(screen.getByRole('status')).toHaveTextContent('Opening the box office…')

    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(health).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('App')).toBeNull()

    await act(() => vi.advanceTimersByTimeAsync(3000))
    expect(health).toHaveBeenCalledTimes(3)
    expect(screen.getByText('App')).toBeInTheDocument()
  })

  it('stops the notice timer on unmount', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const { unmount } = render(<BootGate>App</BootGate>)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
