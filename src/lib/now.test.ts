import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNow } from './now'

describe('useNow', () => {
  it('ticks every minute by default', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    const { result } = renderHook(() => useNow())
    expect(result.current).toBe(1_000_000)

    act(() => vi.advanceTimersByTime(59_999))
    expect(result.current).toBe(1_000_000)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe(1_060_000)
  })

  it('takes a custom interval and stops on unmount', () => {
    vi.useFakeTimers({ now: 0 })
    const { result, unmount } = renderHook(() => useNow(1000))
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toBe(1000)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
