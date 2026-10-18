import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useDocumentTitle, useLightsDown } from './lights'

describe('useLightsDown', () => {
  afterEach(() => {
    document.head.innerHTML = ''
  })

  it('dims the page and the browser chrome while mounted', () => {
    document.head.innerHTML = '<meta name="theme-color" content="#E8ECEF">'
    const meta = document.querySelector('meta[name="theme-color"]')!

    const { unmount } = renderHook(() => useLightsDown())
    expect(document.documentElement.dataset.lights).toBe('down')
    expect(meta.getAttribute('content')).toBe('#1A2042')

    unmount()
    expect(document.documentElement.dataset.lights).toBe('up')
    expect(meta.getAttribute('content')).toBe('#E8ECEF')
  })

  it('works without a theme-color meta tag', () => {
    const { unmount } = renderHook(() => useLightsDown())
    expect(document.documentElement.dataset.lights).toBe('down')
    unmount()
    expect(document.documentElement.dataset.lights).toBe('up')
  })
})

describe('useDocumentTitle', () => {
  it('sets the title, and keeps the last one while there is none', () => {
    const { rerender } = renderHook(({ title }: { title: string | undefined }) => useDocumentTitle(title), {
      initialProps: { title: 'Sign in' as string | undefined },
    })
    expect(document.title).toBe('Sign in')

    rerender({ title: undefined })
    expect(document.title).toBe('Sign in')

    rerender({ title: 'My bookings' })
    expect(document.title).toBe('My bookings')
  })
})
