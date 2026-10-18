import { vi } from 'vitest'

// A fake API behind `fetch`. Routes are "METHOD /path/{param}" (the path the
// app calls, without the dev proxy's /api prefix). A route's value is the JSON
// body of a 200 reply, or a handler that returns a Response or a body.

export interface Ctx {
  request: Request
  params: Record<string, string>
  query: URLSearchParams
}

export type Handler = (ctx: Ctx) => unknown

// A route: a handler, or the JSON body of a 200 reply.
export type Route = Handler | object | string | number | boolean | null

export const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// An error reply in the API's envelope.
export const fail =
  (status: number, code: string, extra: { message?: string; details?: unknown[]; requestId?: string } = {}) =>
  (): Response =>
    json(status, { error: { code, message: extra.message ?? code, details: extra.details ?? [], requestId: extra.requestId } })

// A request that never answers, to hold a page in its loading state.
export const hang: Handler = () => new Promise(() => {})

function compile(pattern: string) {
  const names: string[] = []
  const source = pattern.replace(/\{(\w+)\}/g, (_, name: string) => {
    names.push(name)
    return '([^/]+)'
  })
  return { regex: new RegExp(`^${source}$`), names }
}

export function mockApi(routes: Record<string, Route>) {
  const requests: Request[] = []
  // Literal routes win over patterns, so /movies/showtimes isn't /movies/{id}.
  const table = Object.entries(routes)
    .map(([key, value]) => {
      const [method, pattern] = key.split(' ')
      return { method, ...compile(pattern), value }
    })
    .sort((a, b) => a.names.length - b.names.length)

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(new URL(String(input), location.origin), init)
    requests.push(request.clone())
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api(?=\/)/, '')

    for (const route of table) {
      const match = route.method === request.method && path.match(route.regex)
      if (!match) continue
      const params = Object.fromEntries(route.names.map((name, i) => [name, decodeURIComponent(match[i + 1])]))
      const reply =
        typeof route.value === 'function'
          ? await (route.value as Handler)({ request, params, query: url.searchParams })
          : route.value
      return reply instanceof Response ? reply : json(200, reply)
    }
    return json(404, { error: { code: 'UNMOCKED', message: `${request.method} ${path}` } })
  })
  vi.stubGlobal('fetch', fetchMock)

  const matching = (method: string, path: string) =>
    requests.filter((r) => r.method === method && new URL(r.url).pathname.replace(/^\/api(?=\/)/, '') === path)

  return {
    fetch: fetchMock,
    requests,
    matching,
    // The JSON body of the last request to that endpoint.
    async body(method: string, path: string) {
      const last = matching(method, path).at(-1)
      if (!last) throw new Error(`No ${method} ${path} request`)
      return last.clone().json()
    },
  }
}
