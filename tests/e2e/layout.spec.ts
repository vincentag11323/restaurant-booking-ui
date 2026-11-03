import { expect, test } from "@playwright/test";
import type { AdminReservation } from "../../src/types/api";
import { ADMIN, GUEST, makeReservation, mockApi } from "./mock-api";

const row: AdminReservation = { ...makeReservation(), customer: { name: "Ayu Lestari", email: "ayu@example.com", phone: null } };

const screens = [
  { path: "/login", as: null },
  { path: "/register", as: null },
  { path: "/menu", as: GUEST },
  { path: "/chat", as: null },
  { path: "/", as: GUEST },
  { path: "/bookings", as: GUEST },
  { path: "/profile", as: GUEST },
  { path: "/admin", as: ADMIN },
  { path: "/admin/logs", as: ADMIN },
];

for (const screen of screens) {
  test(`${screen.path} never scrolls sideways`, async ({ page }) => {
    await mockApi(page, { signedInAs: screen.as, reservations: [makeReservation()], adminRows: [row] });
    await page.goto(screen.path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(screen.path === "/profile" ? 1 : 0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
