# resortos-booking-web

Web app for the ResortOS restaurants: guests reserve and manage tables, admins read the booking log. One React app, role-based routes.

React 19 · Vite · TypeScript · Tailwind CSS 4 · React Router · Playwright

Specs live in the planning repo (`../requirements/`): `ui_spec.md` (screens), `api_spec.md` (the API this app calls). Visual direction is in [DESIGN.md](DESIGN.md).

## Run locally

Start the API first (see `../resortos-booking-api/README.md`), then:

```bash
npm install
npm run dev            # http://localhost:5173, /api is proxied to http://localhost:4000
```

Sign in as the seeded admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from the API's `.env`) to see the admin pages, or create a guest account on `/register`.

## Test

```bash
npx playwright install chromium   # first time only
npm test               # UI suite on a desktop and a phone viewport
npm run typecheck
```

UI tests mock every `/api` call with `page.route` (`tests/e2e/mock-api.ts`), so they need no backend. The API's own suite verifies the real endpoints against the same spec.

## Layout

| Path | What lives there |
|---|---|
| `src/types/` | This app's copy of the API types (kept separate from the backend on purpose) |
| `src/lib/api.ts` | `fetch` wrapper: bearer token, one refresh-and-retry on 401 |
| `src/auth/` | Session context (access token in memory, refresh cookie restores it on reload) |
| `src/pages/` | Guest screens; `src/pages/admin/` read-only admin screens |
| `src/components/` | Layout, native `<dialog>` wrapper, small UI pieces |

## Build

```bash
VITE_API_URL=https://api.example.com npm run build   # static files in dist/
```

The API's `CORS_ORIGIN` must match the site's origin, and both must be served over HTTPS. The refresh cookie is `SameSite=Lax`, so host the app and API on the same site (e.g. `app.example.com` and `api.example.com`), or serve the API under the app's own `/api` path.
