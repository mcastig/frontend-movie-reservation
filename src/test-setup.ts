import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { clearTokens } from './api/session'

// jsdom has no layout, so scrolling is a no-op.
Element.prototype.scrollIntoView = () => {}

// jsdom has <dialog> but not its modal methods.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.open = true
}
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  if (!this.open) return
  this.open = false
  this.dispatchEvent(new Event('close'))
}

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
