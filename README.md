# Movie reservation web app

The website of a small cinema with two halls: today's listings, seat booking on the hall's seat plan, and a back office. It's built
from [SPECS.md](SPECS.md) on top of the [movie reservation API](https://movie-reservation-api-q5am.onrender.com/docs).

React 19, React Router, TanStack Query and `openapi-fetch`, built with Vite. Plain CSS modules, no UI library.

## Run it

Needs Node 22 (what CI uses).

```sh
npm install
npm run dev        # http://localhost:5173, proxied to the API in .env.development
```

The live API is on a free plan that sleeps when idle, so the first load can take up to a minute. The app says so while it waits.

| Command                 | What it does                                                       |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run dev`           | Dev server; `/api/*` is forwarded to `VITE_API_URL`                |
| `npm run build`         | Type-check, then build to `dist/`                                  |
| `npm run preview`       | Serve the built `dist/`                                            |
| `npm run lint`          | ESLint                                                             |
| `npm run typecheck`     | `tsc -b` for the app, Node config and e2e projects                 |
| `npm test`              | Unit tests (Vitest); `npm run test:watch` to watch                 |
| `npm run test:coverage` | Unit tests with coverage; fails below 100%                         |
| `npm run test:e2e`      | Playwright, against the local API with seed data (see below)       |
| `npm run gen:api`       | Regenerate `src/api/schema.d.ts` from `$VITE_API_URL/openapi.json` |

## Pages

| Path                 | Page                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `/`                  | Listings by day                                                  |
| `/movies/:id`        | A movie and its showtimes                                        |
| `/showtimes/:id`     | Seat plan and booking, with the lights down                      |
| `/bookings`          | Your bookings (signed in)                                        |
| `/signin`, `/signup` | Accounts                                                         |
| `/admin/*`           | Back office (admins): movies, schedule, bookings, reports, users |
| `/styleguide`        | Tokens and components in both lighting states (dev only)         |

## Configuration

| Variable           | Default                 | Notes                                                           |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| `VITE_API_URL`     | `http://localhost:3000` | The live API is set in `.env.development` and `.env.production` |
| `VITE_CURRENCY`    | `USD`                   | The API has no currency field                                   |
| `VITE_CINEMA_NAME` | `The Lantern`           | Shown in the header                                             |

## End-to-end tests

The booking and admin tests create accounts, book and cancel seats, so run them only against a local, seeded API:

```sh
# in the API repo: npm run db:seed && npm run dev
E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run test:e2e
```

Playwright starts the dev server itself, pointed at `E2E_API_URL` (default `http://localhost:3000`). Set `E2E_BASE_URL` to test an
app that's already running instead. Every test runs on a phone and a desktop viewport, and `a11y.spec.ts` checks pages with axe.

## CI

`.github/workflows/web.yml` runs lint, typecheck, unit tests (failing below 100% coverage) and the build on every push to
`main` and every pull request. The end-to-end tests aren't in CI because they need a seeded API.

## Deploy

Either host works; both build with `npm ci && npm run build`, serve `dist/`, send every path to `index.html` (so deep links
like `/showtimes/5` load the app) and set a CSP that allows only the API and Google Fonts.

- **Vercel:** `vercel.json`. Import the GitHub repo in Vercel (or run `npx vercel` here), keep the detected settings, and
  deploy. Every push to `main` then deploys to production, and every pull request gets a preview URL.
- **Render:** `render.yaml`, a static site.

Before the first deploy, add the site's URL to the API's `CORS_ORIGINS` (backend task B0), or the browser blocks every API
response. Vercel preview URLs change per deploy, so list the production domain, and add previews only if you need them to
reach the API.

`VITE_API_URL`, `VITE_CURRENCY` and `VITE_CINEMA_NAME` come from `.env.production`. Set them in the host's environment
variables to override them; if you point at another API, add its origin to the CSP's `connect-src` in `vercel.json` too.
