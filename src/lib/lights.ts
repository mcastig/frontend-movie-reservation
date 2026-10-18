import { useEffect } from 'react'

const themeColors = { up: '#FFFFFF', down: '#111827' }

// Dims the whole page while it's mounted: the house lights going down.
export function useLightsDown() {
  useEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector('meta[name="theme-color"]')
    root.dataset.lights = 'down'
    meta?.setAttribute('content', themeColors.down)
    return () => {
      root.dataset.lights = 'up'
      meta?.setAttribute('content', themeColors.up)
    }
  }, [])
}

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}
