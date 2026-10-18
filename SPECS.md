# Frontend Plan

A step-by-step plan for building the web app on top of this API, for frontend developers or coding agents. It covers:

- what to build;
- the design direction;
- the exact API contract;
- the backend changes the frontend needs first.

Work through the phases in order. Each one ends in something you can use, with a "done when" check.

The API is live at **https://movie-reservation-api-q5am.onrender.com**:

- interactive docs at `/docs`;
- the machine-readable contract at `/openapi.json`.

---

## The product

**Subject:** the website of one small cinema with two halls. It's for the people who go there, mostly on their phones on the way
out the door, plus the few staff who run the schedule.

**Its single job:** get someone from "what's on tonight?" to a booked seat in under a minute.

**Three surfaces:**

| Surface         | Who             | What they do                                                                      |
| --------------- | --------------- | --------------------------------------------------------------------------------- |
| **Listings**    | Anyone          | See what's showing on a day, read about a movie, pick a showtime                  |
| **Booking**     | Signed-in users | Pick seats on the hall's seat plan, book them, see and cancel their bookings      |
| **Back office** | Admins          | Manage movies and genres, schedule showtimes, see bookings, occupancy and revenue |

---

## Design direction

### The idea: house lights

A cinema has two lighting states, and the app borrows both:

- **House lights up:** you're in the lobby reading the listings. The interface is bright, calm and easy to scan in daylight.
- **House lights down:** you've picked a showtime and you're choosing seats. The page dims to the auditorium's dark blue, the
  screen glows at the top, and the seats are the brightest things on the page.

That one transition is the app's signature. Everything else stays quiet.

### Color

The look follows a clean product UI ([The Odin Project's sign-up page](https://www.theodinproject.com/sign_up) was the
reference): a cool gray page, white panels with a hairline border and a soft shadow, one teal for every action. Gold is the
cinema's own: the color of an "admit one" ticket, used only for what's yours.

| Name      | Hex       | Used for                                                               |
| --------- | --------- | ---------------------------------------------------------------------- |
| Gray 50   | `#F9FAFB` | Page background with the lights up                                     |
| White     | `#FFFFFF` | Panels: forms, the listings, tables, the header bar                    |
| Gray 200  | `#E5E7EB` | Panel borders and dividers (`#D1D5DB` for control borders)             |
| Gray 500  | `#6B7280` | Secondary text with the lights up (`#374151` body, `#111827` headings) |
| Gray 900  | `#111827` | Headings with the lights up; the background with the lights down       |
| Teal 700  | `#0F766E` | Primary buttons, links in focus, the current day and tab               |
| Gold      | `#CE973E` | Selected seats, booking stubs and the Book button ("yours")            |
| Pale gold | `#F6EAD3` | Booked tickets on My bookings                                          |
| Red 600   | `#DC2626` | Errors with the lights up; `#F87171` with the lights down              |

With the lights down the page uses the dark theme: gray 900 background, gray 800 panels, gray 300 text, gray 400 secondary
text, teal 300 (`#5EEAD4`) for actions.

Contrast, measured (WCAG AA needs 4.5:1 for text):

| Pair                               | Ratio                                |
| ---------------------------------- | ------------------------------------ |
| Gray 900 on gray 50                | 17.0                                 |
| Gray 500 on white; on gray 50      | 4.8; 4.6 (the lightest text allowed) |
| White on teal 700                  | 5.5                                  |
| Gray 900 on gold                   | 6.9 (never white text on gold)       |
| Gray 900 on pale gold              | 14.9                                 |
| Red 600 on white; `#F87171` on 900 | 4.8; 6.4                             |
| Gray 100 seats on gray 900         | 16.1                                 |
| Gray 400 on gray 900; on gray 800  | 7.0; 5.8                             |
| Gray 900 on teal 300               | 12.0                                 |

Free and taken seats differ by more than color (2.3:1 between gray 100 and gray 400). Taken seats are outlined and carry a `✕`, so
color-blind users and grayscale screens still see the difference.

### Type

- **Big Shoulders Display** (Google Fonts). A condensed face drawn from Chicago's signage, close to how cinema marquees and
  ticket printers set letters. Used _with restraint_:
  - movie titles;
  - showtimes;
  - seat codes (`B4`);
  - the total on the booking button.

  Never use it for paragraphs.

- **Inter** (Google Fonts), weights 400–700. Body text, forms, navigation and the back office, as on the reference. Headings
  in Inter are bold with tight tracking (−0.025em). It has tabular figures for prices and tables.

Type scale: 14 / 16 / 20 / 25 / 31 / 39 / 49 px. Interface text (labels, buttons, nav, tables) is 14 px.

- Titles: Big Shoulders at 39–49 px, weight 800, letter-spacing +0.01em, sentence or title case as the movie's name is
  written. **No all-caps labels anywhere.**
- Body: 16 px with a 1.5 line height, lines under 70 characters.

### Layout

Mobile first, single column, left aligned. Wider screens get more air, not more columns, except in the back office.

**Listings** read like a printed cinema listing, not a grid of identical cards. Each movie is a row; its times are buttons.

```
┌──────────────────────────────────────┐
│ Cinema name                 Sign in  │
│                                      │
│ Today  Tue 20  Wed 21  Thu 22  Fri…  │  ← date strip, scrolls sideways
│ ──────────────────────────────────── │
│ ┌────┐ Inception                     │
│ │post│ 2 h 28 min, Action, Sci-Fi    │
│ └────┘ [14:00]  [20:30]              │  ← time buttons; "38 left" under each
│ ──────────────────────────────────── │
│ ┌────┐ Spirited Away                 │
│ │post│ 2 h 5 min, Animation, Drama   │
│ └────┘ [16:00]                       │
└──────────────────────────────────────┘
```

**Seat picking** (lights down) gives the whole screen to the seat plan. Picked seats appear as stubs in a tray at the bottom,
next to the one action.

```
┌──────────────────────────────────────┐
│ ← Inception, Tue 20, 14:00, Hall 1   │
│                                      │
│      ╭────────────────────────╮      │  ← the screen: a glowing arc
│                                      │
│  A   ○ ○ ○ ○ ○ ○ ✕ ✕                 │
│  B   ○ ○ ● ● ○ ○ ○ ○                 │  ← ● picked, ✕ taken, ○ free
│  C   ○ ○ ○ ○ ○ ○ ○ ○                 │     rows curve slightly, like the hall
│  …                                   │
│ ──────────────────────────────────── │
│ ┌──┐┌──┐                             │
│ │B3││B4│      [ Book 2 seats, $24 ]  │  ← stubs tray + the one action
│ └──┘└──┘                             │
└──────────────────────────────────────┘
```

**My bookings** shows each booking as a ticket stub: movie title and time in Big Shoulders, seats, total, and a perforated edge.
Past and cancelled bookings sit below, dimmed.

**The back office** is deliberately plain: Inter only, tables and stats on white panels, left-aligned forms. It's a tool, not a
showcase.

### Motion

One orchestrated moment: **the lights going down** when you open a showtime. The page fades from the light theme to the dark one
(~600 ms) and the screen arc brightens. Then picking a seat slides its stub into the tray (~150 ms). Nothing else animates on
its own. With `prefers-reduced-motion`, the lights change instantly and stubs appear without sliding.

### Checked against the defaults

This plan was reviewed for choices that would appear on any generated page, and three were changed:

1. **Background.** The first draft had a dark cinema theme with gold accents everywhere, which is the stock "movie site". It's
   now dark only while picking seats, where it means something (the lights are down).
2. **Listings.** The draft used a grid of identical poster cards with rounded corners and shadows. They're now listing rows,
   because people choose by _time_ at least as much as by poster.
3. **Accent color.** The draft accent was a warm red. It's now ticket gold, and it's used for one meaning only: "yours".
   Actions are teal, so gold never has to mean "click here".

### Words

Write for the moviegoer, not the database. They book **seats**, not "reservations"; staff schedule **showtimes**.

| Moment                                   | Say                                                                                 |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| Booking button                           | "Book 2 seats, $24.00" (count and total always visible)                             |
| Success                                  | "Booked. See you on Tue 20 at 14:00."                                               |
| Cancel button / result                   | "Cancel booking" → "Booking cancelled. Seats B3 and B4 are free again."             |
| Seat taken while picking (`SEATS_TAKEN`) | "B4 was just booked by someone else. Pick another seat."                            |
| Too late to cancel (`SHOWTIME_STARTED`)  | "This showtime has started, so the booking can't be cancelled."                     |
| Empty day                                | "Nothing showing on Wed 21. Try another day."                                       |
| Rate limited (429)                       | "Too many attempts. Try again in 12 minutes." (minutes from the `RateLimit` header) |
| Server waking up                         | "Opening the box office…" (see [The API, in practice](#the-api-in-practice))        |

Movie metadata is separated by commas, never by middle dots ("2 h 28 min, Action, Sci-Fi").

---

## Technical decisions

| Area         | Choice                                                                                   | Why                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Framework    | **React 19 + Vite + TypeScript**                                                         | Most common, so most developers and agents know it. No server rendering needed: the API is the server               |
| Location     | **`web/` in this repo**                                                                  | One repo, one CLAUDE.md, the API contract next to the client. CI gets a second job                                  |
| Routing      | React Router                                                                             | `/`, `/movies/:id`, `/showtimes/:id`, `/bookings`, `/signin`, `/signup`, `/admin/...`                               |
| Server state | **TanStack Query**                                                                       | Caching, refetch on focus (seat availability changes), loading and error states                                     |
| API client   | **`openapi-typescript` + `openapi-fetch`**                                               | Types are generated from `/openapi.json`, so the client can't drift from the API. Regenerate after every API change |
| Styling      | Plain CSS with custom properties (the tokens above) + CSS modules                        | Few rules, no framework defaults to fight                                                                           |
| Tests        | Vitest + Testing Library; **Playwright** end to end against the local API with seed data | The seed has stable ids (showtime 1, seat 9 = B1), so e2e tests are predictable                                     |
| Hosting      | Render static site (same account as the API)                                             | Free, HTTPS, deploys from the same repo                                                                             |

---

## The API, in practice

The OpenAPI document is the source of truth for request bodies. The notes below are what it doesn't say: response shapes,
behaviors, and edge cases, captured from the live API.

### Auth flow

```
POST /auth/login  { email, password }
→ 200 { tokenType: "Bearer", accessToken, expiresIn: 900, refreshToken }
```

- **Requests:** send `Authorization: Bearer <accessToken>` on every authenticated request.
- **Expiry:** the access token lasts **15 minutes**. On `401` with code `TOKEN_EXPIRED`:
  1. call `POST /auth/refresh { refreshToken }`;
  2. store **both** new tokens;
  3. retry the request once.
- **Refresh tokens work once.** If two requests refresh at the same time, the second one presents a used token. The API treats
  that as theft and **signs the user out everywhere**. So refresh must be _single-flight_: one shared promise that every
  waiting request awaits.
- **Sign up:** `POST /auth/signup` creates a regular user (201). Then sign in.
- **Sign out:** `POST /auth/logout { refreshToken }` → 204. Then drop both tokens.
- **Who's signed in:** `GET /me` → `{ id, email, name, role: "user" | "admin", createdAt }`. Use `role` to show the back office.
  It's only for showing and hiding UI; the API enforces the real permissions.
- **Token storage:** keep the access token **in memory only**. The refresh token has to survive a page reload. Until backend task
  B1 below is done, it goes in `localStorage`. That's readable by any script running on the page, so ship with a strict CSP and
  no third-party scripts.

### Response shapes

```ts
// GET /movies?page&limit&genre  → paginated
{ data: Movie[], pagination: { page, limit, total, totalPages } }
Movie = { id, title, description, posterUrl: string | null, durationMinutes, createdAt, genres: { id, name }[] }

// GET /movies/showtimes?date=2026-10-20  → the listings for one day
{ date, timezone: "UTC", movies: (Movie & { showtimes: {
    id, startsAt, endsAt, priceCents, seatsAvailable, hall: { id, name } }[] })[] }

// GET /showtimes/:id/seats  → the seat plan
{ showtime: { id, startsAt, endsAt, priceCents, movie: { id, title, durationMinutes }, hall: { id, name } },
  totalSeats, availableSeats,
  rows: { row: "A", seats: { id, number, available }[] }[] }

// POST /reservations { showtimeId, seatIds }  → 201, and GET /reservations/me (paginated)
Reservation = { id, userId, status: "confirmed" | "cancelled", totalCents, createdAt, cancelledAt,
  showtime: { id, startsAt, endsAt, movie: { id, title }, hall: { id, name } },
  seats: { id, row, number, priceCents }[] }

// POST /reservations/:id/cancel  → 200, the updated reservation

// GET /admin/reports/showtimes?from&to
{ range, totals: { showtimes, capacity, ticketsSold, occupancyPct, revenueCents, cancelledReservations },
  showtimes: { id, startsAt, movie, hall, capacity, ticketsSold, occupancyPct, revenueCents, cancelledReservations }[] }
// GET /admin/reports/movies?from&to  → { range, totals: { ticketsSold, revenueCents }, movies: [...] }
// GET /admin/reservations?showtimeId&status&from&to&page&limit  → paginated reservations, each with user { id, name, email }
```

### Errors

Every error has the same shape. **Branch on `code`, not on `message`:**

```json
{ "error": { "code": "SEATS_TAKEN", "message": "Seat(s) already taken: B4", "details": [...] } }
```

| Status | Codes                                                                                                                                   | What the UI does                                                                               |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 400    | `VALIDATION_ERROR` (`details: [{ path: "body.seatIds", message }]`), `INVALID_JSON`                                                     | Show the message next to the field; `path` names it                                            |
| 401    | `TOKEN_EXPIRED`                                                                                                                         | Refresh and retry, as described above                                                          |
| 401    | `INVALID_TOKEN`, `UNAUTHENTICATED`, `INVALID_REFRESH_TOKEN`, `INVALID_CREDENTIALS`                                                      | Go to sign-in (keep the page they were on); for credentials, "Email or password is incorrect." |
| 403    | `FORBIDDEN`, `CANNOT_CHANGE_OWN_ROLE`                                                                                                   | "You don't have access to this."                                                               |
| 404    | `NOT_FOUND`                                                                                                                             | A not-found page that offers today's listings                                                  |
| 409    | `SEATS_TAKEN`                                                                                                                           | Refetch the seat plan, unselect the lost seats, say which ones                                 |
| 409    | `SHOWTIME_STARTED`, `ALREADY_CANCELLED`, `EMAIL_TAKEN`, `HALL_BUSY`, `GENRE_EXISTS`, `MOVIE_HAS_SHOWTIMES`, `SHOWTIME_HAS_RESERVATIONS` | Show the message; each has one obvious fix                                                     |
| 413    | `BAD_REQUEST`                                                                                                                           | Body over 100 kB (only a huge description could do this)                                       |
| 429    | `TOO_MANY_REQUESTS`                                                                                                                     | `/auth` allows 20 tries per 15 minutes per IP. Read `RateLimit: ...; t=<seconds>` for the wait |
| 500    | `INTERNAL_ERROR` (+ `requestId`)                                                                                                        | "Something went wrong on our side. Reference: <requestId>." Logs can be searched by it         |

### Behaviors to design for

- **Times are in the cinema's timezone.** The listings say which (`timezone`). Format every time with `Intl.DateTimeFormat`
  in **that** timezone, not the browser's. A visitor from another country must see the time printed on the ticket.
- **Money is integer cents** (`priceCents`, `totalCents`). Format with `Intl.NumberFormat`. The API has no currency field, so set
  it once in config (`VITE_CURRENCY=USD`).
- **The server computes the price.** Show `seats × priceCents` as a preview, but display the `totalCents` from the response as
  the truth.
- **At most 10 seats per booking**, with no duplicates. Disable further picks at 10 and say why.
- **The seat plan isn't live.** Refetch it when the page regains focus and every 15 s while picking. A `SEATS_TAKEN` conflict is
  normal, not an error state: someone else was faster.
- **Only upcoming bookings can be cancelled.** Hide the button once `showtime.startsAt` has passed.
- **Posters are just URLs** and the seed's are placeholders that don't load. Design the missing-poster state as a real thing: the
  title set in Big Shoulders on dark gray, in the poster's 2:3 frame.
- **The free API plan sleeps** after 15 minutes idle; the first request then takes up to a minute. On app start, call
  `GET /health`. If it hasn't answered in 2 s, show "Opening the box office…" instead of a blank page.

---

## Backend prerequisites

Small API changes the frontend needs. Do these first, or in parallel with phases F0–F2. They follow the backend's own
conventions (see CLAUDE.md).

| #   | Change                                                                                                              | Needed by          | Why                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| B0  | Add the frontend's origin to **`CORS_ORIGINS`** (Render env + `http://localhost:5173` for dev)                      | F0                 | Without it, the browser blocks every response                                                                       |
| B1  | Refresh token in an **`httpOnly`, `Secure`, `SameSite=Strict` cookie** (scoped to `/auth`) instead of the JSON body | F3 (before launch) | JavaScript can't read the cookie, so an XSS bug can't steal a long-lived token. CORS then needs `credentials: true` |
| B2  | **`GET /halls`** (admin): halls with seat counts                                                                    | F6                 | The "schedule a showtime" form needs to list halls; today there's no way to get their ids                           |
| B3  | **`GET /users?query=`** (admin, paginated)                                                                          | F6                 | Promoting a user needs their id; today it's only visible inside reservations                                        |
| B4  | Optional: **`GET /movies?query=`** title search                                                                     | F2                 | Fine without it at 3 movies; needed with a real catalog                                                             |

---

## Phases

### F0: Setup and the API client

1. **Scaffold** `web/` with Vite (React + TypeScript). Add `npm run dev` (port 5173) and `VITE_API_URL`, defaulting to
   `http://localhost:3000`.
2. **Generate types:** `npx openapi-typescript $VITE_API_URL/openapi.json -o src/api/schema.d.ts`, as a `gen:api` script.
3. **Write one API client** (`src/api/client.ts`) on `openapi-fetch` that:
   - adds the bearer token;
   - turns error bodies into a typed `ApiError { status, code, message, details, requestId }`;
   - refreshes on `TOKEN_EXPIRED` with a single shared promise, and retries once.
4. **Write one `useApi` layer** with TanStack Query: a query key per resource (`["listings", date]`, `["seats", showtimeId]`).
5. **CI:** a `web` job that runs lint, typecheck, tests and build.

**Done when** a page lists the movie titles from `GET /movies`, and a unit test proves that two simultaneous 401s cause exactly one
refresh.

### F1: Design foundation

1. **Tokens** in `src/styles/tokens.css`: the colors above, the type scale, spacing (4 px base), radii (seats are circles; controls
   6 px, panels 8 px; stubs have a perforated edge).
2. **Load the two fonts** from Google Fonts with `font-display: swap`.
3. **Components:** `Button` (primary, quiet), `TimeButton`, `Field` (label, input, error text from `details`), `Toast`, `Stub`,
   `PosterFrame` (with the missing-poster state), `PageState` (loading, empty, error with `requestId`).
4. **A `/styleguide` route** (dev only) showing every component in both lighting states.

**Done when** the style guide passes keyboard-only use (visible focus everywhere) and an axe accessibility check, in both states.

### F2: Listings

1. **`/`:** the date strip (today plus 6 days, in the cinema's timezone) and the listing rows from
   `GET /movies/showtimes?date=`. Under each time, `seatsAvailable` as "38 left". Sold out shows "Sold out" and disables the time.
2. **`/movies/:id`:** poster, description, genres, and its showtimes for the next 7 days, from `GET /movies/:id` plus the listings.
3. **Filter by genre** from `GET /genres` (as chips above the list).

**Done when** a visitor can go from `/` to a showtime in two taps, and times match the API's `timezone` even with the laptop set
to another timezone.

### F3: Accounts

1. **`/signup` and `/signin`** forms. Show field errors from `VALIDATION_ERROR.details`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, and
   the 429 wait time.
2. **Session state:** sign in, sign out, refresh on reload, and signing out everywhere when a refresh fails.
3. **Route guard:** signed-out visitors who press "Book" go to sign-in, then come back to the same seats.

**Done when** a session survives a reload and a 16-minute idle (the token expires and refreshes silently), and sign-out works.

### F4: Seat picking and booking (the signature)

1. **`/showtimes/:id`:** the lights-down transition, the screen arc, and the seat plan from `GET /showtimes/:id/seats`.
2. **Seats are toggle buttons:**
   - `aria-pressed` for the selected state;
   - a label like "Row B, seat 4, available";
   - arrow keys move between seats (roving tabindex).

   Taken seats are disabled and marked with `✕`, not just a color.

3. **The stub tray:** picked seats in order, each removable. The button reads "Book N seats, $X".
4. **Booking:** `POST /reservations`. On 201, show the success copy and go to the booking. On `SEATS_TAKEN`, refetch, unselect
   the lost seats, and name them.
5. **Freshness:** refetch every 15 s and on focus. If a picked seat becomes taken, unselect it and say so.

**Done when:**

- a Playwright test books B3+B4 on showtime 1;
- a second browser trying B4 at the same time gets the friendly conflict;
- the whole flow works with a keyboard only and with VoiceOver.

### F5: My bookings

1. **`/bookings`:** `GET /reservations/me` as stubs. Upcoming first; past and cancelled below, dimmed.
2. **Cancel:** a confirm step, then `POST /reservations/:id/cancel`. Handle `SHOWTIME_STARTED` and `ALREADY_CANCELLED`.

**Done when** cancelling frees the seats: the showtime's seat plan shows them as available again.

### F6: Back office (admins only, behind `role === "admin"`)

1. **Movies:** list, create, edit (`PATCH`, partial), delete (`MOVIE_HAS_SHOWTIMES` explains why it can't be deleted). Genres
   as a multi-select; create genres inline.
2. **Schedule:** a week view per hall from the listings data, plus a "schedule a showtime" form:
   - movie, hall (needs B2), start time sent with its timezone offset, price;
   - show `HALL_BUSY` against the time field;
   - remind the admin that `endsAt` includes the cleaning time.
3. **Bookings:** `GET /admin/reservations` with filters (showtime, status, date range) and pagination.
4. **Reports:** both reports with a date range. Occupancy as a plain bar per showtime, revenue formatted as money. No chart
   library is needed for this.
5. **Users:** find a user (needs B3) and change their role. `CANNOT_CHANGE_OWN_ROLE` is explained.

**Done when** an admin can schedule tomorrow's showtimes for a new movie without using `/docs`.

### F7: Quality pass

- **Responsive:** from 320 px wide up to desktop. On desktop, the seat plan scales up, and the back office uses its tables at
  full width.
- **Accessibility:**
  - axe shows no violations;
  - contrast is checked in both lighting states;
  - the reduced-motion setting is respected;
  - every action is reachable by keyboard.
- **Performance:** Lighthouse mobile ≥ 90; fonts preloaded; posters lazy-loaded with fixed 2:3 boxes, so nothing shifts while
  loading.
- **Playwright** suite against the local API (`npm run db:seed` before the run) covering F2–F6.

### F8: Deploy

1. Add a Render **static site** to `render.yaml`:
   - `rootDir: web`, build `npm ci && npm run build`, publish `web/dist`;
   - `VITE_API_URL` = the API URL;
   - a rewrite of `/*` to `/index.html`, so deep links work.
2. Add its URL to the API's `CORS_ORIGINS` (B0).
3. Set security headers on the static site: a CSP that allows only the API and Google Fonts.

**Done when** the public site books a seat against the public API.

---

## Rules for agents working on this

- **Use the generated types.** Don't hand-write API types or invent endpoints. If something is missing, it's a backend
  prerequisite: add it to the table above instead of working around it.
- **Never trust the client for money or permissions.** Prices and totals shown after booking come from the response. Hiding admin
  UI is cosmetic; the API enforces the rules.
- **Branch on `error.code`.** Messages are for people and may change.
- **Every phase ends green:** lint, typecheck, tests and build. Same commit rules as the backend (CLAUDE.md).
- **Derive every color and font from the tokens.** No new colors or typefaces without updating the design direction here.
