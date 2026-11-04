# resortos-booking-web

Mobile-first PWA for the ResortOS restaurants: guests reserve and manage tables, admins read the booking log. One React app, role-based routes, installable to the home screen.

React 19 · Vite · vite-plugin-pwa · TypeScript · Tailwind CSS 4 · React Router · Playwright

Specs live in the planning repo (`../requirements/`): `UI_SPEC.md` (screens), `API_SPEC.md` (the API this app calls). Visual direction is in [DESIGN.md](DESIGN.md).

## Run locally

Start the API first (see `../resortos-booking-api/README.md`), then:

```bash
npm install
npm run dev            # http://localhost:5173: /api → booking API :4000, /agent → assistant :4300
```

Sign in as the seeded admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from the API's `.env`) to see the admin pages, or create a guest account on `/register`.

## Test

```bash
npx playwright install chromium   # first time only
npm test               # builds, serves the production build, runs the UI suite on a Pixel 7 viewport
npm run typecheck
```

UI tests mock every `/api` call with `page.route` (`tests/e2e/mockApi.ts`), so they need no backend. The API's own suite verifies the real endpoints against the same spec. Service workers are blocked in tests except in `pwa.spec.ts`, which checks the manifest, icons, service worker and offline start.

## PWA

* `vite-plugin-pwa` generates the manifest and service worker at build time (`npm run build`). Icons come from `public/favicon.svg` (a placeholder, see DESIGN.md).
* The service worker precaches the app shell only. `/api` is never cached, so bookings and availability are always live. Without a network, the app still opens and API errors say the guest is offline.
* Try it: `npm run build && npx vite preview`, open http://localhost:4173 in Chrome, then use Install. On iPhone, use Safari's Share → Add to Home Screen. Installing needs HTTPS in production (localhost is exempt).
* The service worker is not active in `npm run dev`.

## Layout

| Path | What lives there |
|---|---|
| `src/types/` | This app's copy of the API types (kept separate from the backend on purpose) |
| `src/backendApi/` | Calls to the booking API: `fetch` wrapper sending the HttpOnly session cookie; a 401 outside `/auth/` sends the guest to sign in (no refresh, no retry) |
| `src/agentApi/` | Calls to the booking assistant (`/agent/chat`); no auth, the guest's email goes in each message |
| `src/auth/` | Session context (on page load it asks `GET /me` who is signed in; the 1-hour session cookie is never extended) |
| `src/pages/` | Guest screens (including `ChatPage` for the assistant); `src/pages/admin/` read-only admin screens |
| `src/components/` | Layout, native `<dialog>` wrapper, small UI pieces |

## Build

```bash
VITE_API_URL=https://api.example.com npm run build   # static files in dist/
```

The API's `CORS_ORIGIN` must match the site's origin, and both must be served over HTTPS. The session cookie is `SameSite=Lax`, so host the app and API on the same site (e.g. `app.example.com` and `api.example.com`), or serve the API under the app's own `/api` path.

## Test build
`npm run preview:test` builds and serves on :5190 against the test API (:4400) and assistant (:4500); used by `resortos-booking-e2e`.

Naming: folders lowercase (kebab-case when multi-word), React components PascalCase, other files camelCase.
