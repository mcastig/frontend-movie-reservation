# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The web app for a small two-hall cinema, built from **SPECS.md**, the source of truth for product, design direction, copy and the
API contract. Read the relevant SPECS.md section before changing a surface. Its rules for agents apply: use the generated types,
never trust the client for money or permissions, branch on `error.code`, derive every color and font from the tokens.

The spec puts the app in `web/` of the API repo. Here it lives at this repo's root instead.

## Commands

- `npm run dev`: dev server on port 5173
- `npm run build`: `tsc -b` (app, node and e2e projects), then `vite build`
- `npm run lint` / `npm run typecheck` / `npm test` (Vitest, `src/**/*.test.ts(x)`)
- Run a single unit test: `npx vitest run src/api/client.test.ts -t "refreshes once"`
- `npm run test:e2e`: Playwright in `e2e/`. Booking and admin specs mutate data, so run them only against a local seeded API
  (`E2E_API_URL`, default `http://localhost:3000`). Admin specs need `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`.
  `E2E_BASE_URL` points the suite at an already-running app.
- `npm run gen:api`: regenerate `src/api/schema.d.ts` from `$VITE_API_URL/openapi.json` after any API change
- CI (`.github/workflows/web.yml`, Node 22) runs lint, typecheck, unit tests and build. Run those four before calling work done;
  e2e isn't in CI.

## Architecture

- **Routes** (`src/router.tsx`): lobby pages share `LobbyLayout` (header, lights up). `/showtimes/:id` sits outside it so the seat
  plan gets the whole screen. `/admin/*` uses the wide lobby layout behind `RequireAdmin`. `/styleguide` exists only in dev.
- **Config** (`src/config.ts`): env values plus app constants (`maxSeatsPerBooking`, `seatPlanRefetchMs`…). Put new tunables there.
- **Cold start:** `BootGate` polls `/health` and shows a "waking up" notice, because the free API plan sleeps when idle.
- **API access** (`src/api/`):
  - `client.ts` is `openapi-fetch` with a custom `authFetch`, which adds the bearer token and, on `TOKEN_EXPIRED`, refreshes and
    retries once. Refresh is single-flight (`refreshSession` shares one promise), because the API treats a reused refresh token
    as theft and signs the user out everywhere. Keep it that way.
  - `call<T>()` unwraps results and throws a typed `ApiError` (`errors.ts`).
  - `describeError()` holds the user-facing copy for every error code.
  - The OpenAPI document only describes **request** bodies, so response shapes are hand-typed in `types.ts`, mirroring SPECS.md.
  - All TanStack Query hooks and query keys live in `hooks.ts`.
- **Session** (`src/api/session.ts`, `src/auth/`): the access token is in memory only. The refresh token is in localStorage until
  backend task B1. `endSession()` notifies `AuthProvider`. Route guards are in `auth/guards.tsx`, and hiding admin UI is cosmetic
  only.
- **Dev proxy:** in dev, `config.apiUrl` is `${origin}/api` and Vite proxies it to `VITE_API_URL`, because the live API's CORS
  list doesn't include localhost yet (B0). Builds call `VITE_API_URL` directly.
- **Time and money:** every time is formatted in the **cinema's** timezone (`useCinemaTimezone()`, read from the listings
  response), never the browser's. Use the helpers in `src/lib/time.ts`; `zonedIso()` builds offset timestamps for the API. Money
  is integer cents formatted by `lib/money.ts`. Totals shown after booking come from the response.
- **Lighting states:**
  - `src/styles/tokens.css` defines the palette as tokens and the semantic variables (`--bg`, `--text`, `--fill`…) under
    `[data-lights='up' | 'down']`.
  - `useLightsDown()` (`lib/lights.ts`) sets `data-lights="down"` on `<html>` for the seat page, which is the app's one
    orchestrated transition.
  - Components use semantic variables, so they work in both states. `/styleguide` (dev only) shows both.
- **Seat page** (`pages/Showtime.tsx`):
  - The seat plan refetches every 15 s and on focus.
  - Each new plan is diffed against the picked seats during render, which unselects and names seats someone else booked.
    `SEATS_TAKEN` just triggers a refetch.
  - Picks travel through `?seats=` across sign-in.
  - `SeatPlan` uses a roving tabindex with arrow keys.
- **Styling:** plain CSS modules per component, plus global `styles/base.css`, which provides `.display` (Big Shoulders, only
  for movie titles, showtimes, seat codes and totals), `.page`, `.visually-hidden` and `.quiet`.
- **Back office** (`pages/admin/`): plain Atkinson tables and forms. Until backend tasks B2 and B3 land, halls are discovered
  from listings and users from admin reservations.

## Conventions

- Don't use `Date.now()` in render; `react-hooks/purity` fails lint, so use `useNow()`.
- Component files export only components (react-refresh lint), so put hooks and contexts in separate `.ts` files.
- TypeScript: `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums), and local imports keep their
  extension in `e2e/` (`./helpers.ts`).
- `openapi-typescript` peers on TS 5; `package.json` has an `overrides` entry that lets it use our TS 6.
- Project skills in `.claude/skills/` (pinned in `skills-lock.json`): `security-best-practices` and `security-auditor`. Use them
  when touching auth, tokens, the CSP in `render.yaml` or anything that renders API data as HTML.
