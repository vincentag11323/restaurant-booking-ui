import type { Page, Route } from "@playwright/test";
import type { AdminReservation, MenuItem, Reservation, Slot, User } from "../../src/types/api";

/**
 * A small in-memory stand-in for the API, so UI tests run without the backend.
 * It follows requirements/API_SPEC.md; the backend's own Playwright suite proves the real API matches it.
 */
export const GUEST: User = { id: "u-guest", email: "ayu@example.com", name: "Ayu Lestari", phone: "+62 812 1111 2222", allergies: ["fish"], role: "USER" };
export const ADMIN: User = { id: "u-admin", email: "admin@resortos.test", name: "Restaurant Admin", phone: null, allergies: [], role: "ADMIN" };
export const PASSWORD = "Password123";

export const MENU: MenuItem[] = [
  { id: "m1", name: "Beef Steak", description: "Grain-fed sirloin, peppercorn sauce.", type: "A_LA_CARTE", priceCents: 28_500_000, allergens: ["dairy"], chefPick: true },
  { id: "m2", name: "Barramundi", description: "Pan-roasted fillet, lemon butter.", type: "A_LA_CARTE", priceCents: 19_500_000, allergens: ["fish", "dairy"], chefPick: false },
  { id: "m3", name: "Seared Scallops", description: "Cauliflower purée, brown butter.", type: "SEASONAL_FINE_DINING", priceCents: 32_000_000, allergens: ["shellfish"], chefPick: true },
];

const SLOT_UTC: Record<string, [string, string]> = {
  "11:00": ["04:00", "06:30"],
  "13:30": ["06:30", "09:00"],
  "17:00": ["10:00", "12:30"],
  "19:30": ["12:30", "15:00"],
};

/** Restaurant-local (UTC+7) date N days from now, inside the 60-day booking window. */
export function inDays(days: number): string {
  return new Date(Date.now() + 7 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);
}

export function slotTimes(date: string, startTime: string) {
  const [s, e] = SLOT_UTC[startTime];
  return { slotStart: `${date}T${s}:00.000Z`, slotEnd: `${date}T${e}:00.000Z` };
}

export function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "r-1",
    code: "RSV-7K3Q9X",
    branch: "BRANCH_1",
    sector: "MAIN_HALL",
    ...slotTimes(inDays(10), "19:30"),
    partySize: 4,
    specialRequests: null,
    status: "CONFIRMED",
    source: "APP",
    tableIds: ["B1-MH-01", "B1-MH-02"],
    createdAt: "2029-12-20T03:00:00.000Z",
    updatedAt: "2029-12-20T03:00:00.000Z",
    cancelledAt: null,
    ...overrides,
  };
}

interface MockOptions {
  signedInAs?: User | null;
  reservations?: Reservation[];
  adminRows?: AdminReservation[];
  /** startTimes that report zero free tables */
  fullSlots?: string[];
  /** startTime whose booking request the "server" rejects for capacity */
  rejectCapacityAt?: string;
  /** Delay (ms) for admin log responses filtered by this status, to simulate a slow query */
  slowStatus?: { status: string; ms: number };
  /** API paths (without /api) that answer 500; prefix a method ("PATCH /users/me") to fail only that method */
  failPaths?: string[];
}

export async function mockApi(page: Page, options: MockOptions = {}) {
  const state = {
    user: options.signedInAs ?? null,
    reservations: [...(options.reservations ?? [])],
    adminRows: options.adminRows ?? [],
    adminQueries: [] as URLSearchParams[],
    created: [] as Record<string, unknown>[],
    /** Set true mid-test: the session cookie has ended, so authed calls get 401. */
    sessionEnded: false,
    /** Every Authorization header the app sent (it should send none: the session is a cookie). */
    authorizationHeaders: [] as string[],
    /** How many times the app asked GET /users/me (the page-load session check). */
    sessionChecks: 0,
  };
  let nextId = 100;

  const reply = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = req.method();
    const body = req.postDataJSON?.() ?? null;
    const session = () => ({ user: state.user });
    const authorization = req.headers().authorization;
    if (authorization) state.authorizationHeaders.push(authorization);
    if (path === "/users/me" && method === "GET") state.sessionChecks++;

    if (options.failPaths?.some((p) => p === path || p === `${method} ${path}`)) return reply(route, 500, { message: "Internal server error" });
    if (path === "/auth/logout") {
      state.user = null;
      return reply(route, 200, { message: "Logged out" });
    }
    if (path === "/auth/login") {
      const match = [GUEST, ADMIN].find((u) => u.email === body.email);
      if (!match || body.password !== PASSWORD) return reply(route, 401, { message: "Invalid email or password" });
      state.user = match;
      return reply(route, 200, session());
    }
    if (path === "/auth/register") {
      if (body.email === GUEST.email) return reply(route, 400, { message: "Email is already registered" });
      state.user = { id: "u-new", email: body.email, name: body.name, phone: body.phone ?? null, allergies: [], role: "USER" };
      return reply(route, 201, session());
    }
    if (path === "/public/menus") return reply(route, 200, MENU.filter((m) => !url.searchParams.get("type") || m.type === url.searchParams.get("type")));
    if (path === "/public/availabilities") {
      const date = url.searchParams.get("date")!;
      const slots: Slot[] = Object.keys(SLOT_UTC).map((startTime) => ({
        startTime: startTime as Slot["startTime"],
        ...slotTimes(date, startTime),
        totalUnits: 50,
        freeUnits: options.fullSlots?.includes(startTime) ? 0 : 42,
        bookable: true,
      }));
      return reply(route, 200, slots);
    }

    if (!state.user) return reply(route, 401, { message: "Authentication required" });
    if (state.sessionEnded) return reply(route, 401, { message: "Invalid or expired token" });

    if (path === "/users/me") {
      if (method === "PATCH") state.user = { ...state.user, ...body };
      return reply(route, 200, state.user);
    }
    if (path === "/users/menus/recommendations") {
      const avoid = new Set(state.user.allergies);
      return reply(route, 200, MENU.filter((m) => !m.allergens.some((a) => avoid.has(a))).sort((a, b) => Number(b.chefPick) - Number(a.chefPick)));
    }
    if (path === "/users/reservations" && method === "GET") return reply(route, 200, state.reservations);
    if (path === "/users/reservations" && method === "POST") {
      state.created.push(body);
      if (body.startTime === options.rejectCapacityAt) return reply(route, 400, { message: "Insufficient capacity for the selected slot" });
      const tables = Math.ceil(body.partySize / (body.sector === "MAIN_HALL" ? 2 : 13));
      const prefix = body.branch === "BRANCH_1" ? "B1" : "B2";
      const reservation = makeReservation({
        id: `r-${nextId++}`,
        branch: body.branch,
        sector: body.sector,
        ...slotTimes(body.date, body.startTime),
        partySize: body.partySize,
        specialRequests: body.specialRequests ?? null,
        tableIds: Array.from({ length: tables }, (_, i) => (body.sector === "MAIN_HALL" ? `${prefix}-MH-0${i + 1}` : `${prefix}-VIP-${i + 1}`)),
      });
      state.reservations.unshift(reservation);
      return reply(route, 201, reservation);
    }
    const one = /^\/users\/reservations\/([^/]+)$/.exec(path);
    if (one) {
      const index = state.reservations.findIndex((r) => r.id === one[1]);
      if (index === -1) return reply(route, 404, { message: "Reservation not found" });
      const current = state.reservations[index];
      if (method === "PATCH") state.reservations[index] = { ...current, ...slotTimes(body.date, body.startTime), partySize: body.partySize ?? current.partySize };
      if (method === "DELETE") state.reservations[index] = { ...current, status: "CANCELLED", cancelledAt: new Date().toISOString() };
      return reply(route, 200, state.reservations[index]);
    }

    if (path.startsWith("/admins/")) {
      if (state.user.role !== "ADMIN") return reply(route, 403, { message: "Forbidden" });
      if (path === "/admins/stats") {
        state.adminQueries.push(url.searchParams);
        return reply(route, 200, {
          date: url.searchParams.get("date"),
          totalBookings: 2,
          agentBookings: 1,
          totalCovers: 9,
          cancellations: 1,
          utilization: [
            { sector: "MAIN_HALL", usedUnits: 5, capacityUnits: 400, rate: 0.0125 },
            { sector: "VIP_WING", usedUnits: 1, capacityUnits: 32, rate: 0.03125 },
          ],
        });
      }
      if (path === "/admins/reservations") {
        state.adminQueries.push(url.searchParams);
        if (options.slowStatus && url.searchParams.get("status") === options.slowStatus.status) {
          await new Promise((resolve) => setTimeout(resolve, options.slowStatus!.ms));
        }
        const q = url.searchParams.get("q")?.toLowerCase();
        const status = url.searchParams.get("status");
        const source = url.searchParams.get("source");
        const matches = state.adminRows.filter((r) => (!status || r.status === status) && (!source || r.source === source) && (!q || r.code.toLowerCase() === q || r.customer.name.toLowerCase().includes(q)));
        const page = Number(url.searchParams.get("page") ?? 1);
        const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
        return reply(route, 200, { items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, page, pageSize });
      }
      if (path === "/admins/reservations/export") {
        const format = url.searchParams.get("format") ?? "csv";
        return route.fulfill({
          status: 200,
          contentType: format === "csv" ? "text/csv" : "application/json",
          headers: { "Content-Disposition": `attachment; filename="reservations.${format}"` },
          body: format === "csv" ? "code,status\n" : "[]",
        });
      }
      const detail = /^\/admins\/reservations\/([^/]+)$/.exec(path);
      const row = detail && state.adminRows.find((r) => r.id === detail[1]);
      return row ? reply(route, 200, row) : reply(route, 404, { message: "Reservation not found" });
    }
    return reply(route, 404, { message: "Route not found" });
  });

  return state;
}
