import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { clearTokens } from './api/session'

// jsdom has no layout, so scrolling is a no-op.
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  clearTokens()
  localStorage.clear()
  delete document.documentElement.dataset.lights
})
