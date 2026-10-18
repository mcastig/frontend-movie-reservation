import type { QueryClient } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api/errors'

const render = vi.fn()
const createRoot = vi.fn<(container: Element) => { render: typeof render }>(() => ({ render }))
vi.mock('react-dom/client', () => ({ createRoot }))

// Walks down single-child elements to the one whose props have `key`.
function findProp<T>(element: ReactElement, key: string): T {
  let current: ReactElement | undefined = element
  while (current) {
    const props = current.props as Record<string, unknown>
    if (key in props) return props[key] as T
    current = props.children as ReactElement | undefined
  }
  throw new Error(`No element with a ${key} prop`)
}

describe('main', () => {
  it('renders the app into #root, with a retry policy for queries', async () => {
    document.body.innerHTML = '<div id="root"></div>'
    await import('./main')

    expect(createRoot).toHaveBeenCalledWith(document.getElementById('root'))
    const client = findProp<QueryClient>(render.mock.calls[0][0], 'client')
    const retry = client.getDefaultOptions().queries!.retry as (count: number, error: unknown) => boolean

    expect(client.getDefaultOptions().queries!.staleTime).toBe(30_000)
    // Network blips and server errors are retried twice.
    expect(retry(0, new TypeError('offline'))).toBe(true)
    expect(retry(1, new ApiError({ status: 503, code: 'INTERNAL_ERROR', message: '' }))).toBe(true)
    expect(retry(2, new TypeError('offline'))).toBe(false)
    // Client errors won't fix themselves.
    expect(retry(0, new ApiError({ status: 404, code: 'NOT_FOUND', message: '' }))).toBe(false)
  })
})
