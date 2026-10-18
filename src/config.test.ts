import { describe, expect, it, vi } from 'vitest'

const load = async () => {
  vi.resetModules()
  return (await import('./config')).config
}

describe('config', () => {
  it('goes through the dev proxy in development', async () => {
    vi.stubEnv('DEV', true)
    const config = await load()
    expect(config.apiUrl).toBe(`${location.origin}/api`)
  })

  it('calls the API directly in builds, with defaults', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_API_URL', undefined)
    vi.stubEnv('VITE_CURRENCY', undefined)
    vi.stubEnv('VITE_CINEMA_NAME', undefined)
    const config = await load()
    expect(config).toMatchObject({ apiUrl: 'http://localhost:3000', currency: 'USD', cinemaName: 'The Lantern' })
  })

  it('reads the environment', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_API_URL', 'https://api.example.com')
    vi.stubEnv('VITE_CURRENCY', 'EUR')
    vi.stubEnv('VITE_CINEMA_NAME', 'The Odeon')
    const config = await load()
    expect(config).toMatchObject({ apiUrl: 'https://api.example.com', currency: 'EUR', cinemaName: 'The Odeon' })
  })
})
