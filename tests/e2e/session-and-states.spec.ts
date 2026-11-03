import { expect, test } from "@playwright/test";
import type { AdminReservation } from "../../src/types/api";
import { ADMIN, GUEST, inDays, makeReservation, mockApi, slotTimes } from "./mock-api";

const upcoming = makeReservation({ id: "r-up", code: "RSV-UPC0M1", ...slotTimes(inDays(5), "19:30") });

test.describe("session", () => {
  test("a signed-in guest stays signed in after a reload", async ({ page }) => {
    const api = await mockApi(page, { signedInAs: GUEST });
    await page.goto("/profile");
    await page.reload();
    await expect(page.getByLabel("Full name")).toHaveValue(GUEST.name);
    expect(api.sessionChecks).toBeGreaterThan(0);
    expect(api.authorizationHeaders).toEqual([]);
  });

  test("when the session has ended, the screen keeps what it shows and the next server call sends the guest to sign in", async ({ page }) => {
    const api = await mockApi(page, { signedInAs: GUEST });
    await page.goto("/profile");
    await expect(page.getByLabel("Full name")).toHaveValue(GUEST.name);
    api.sessionEnded = true;
    await expect(page.getByLabel("Full name")).toHaveValue(GUEST.name);
    await expect(page).toHaveURL(/\/profile$/);
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("without a session, the page-load check sends the guest to sign in", async ({ page }) => {
    await mockApi(page);
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signing out returns to the sign-in page and protects pages again", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST });
    await page.goto("/bookings");
    await page.getByRole("link", { name: "Profile" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/bookings");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an admin who opens a guest page is sent to the admin home", async ({ page }) => {
    await mockApi(page, { signedInAs: ADMIN });
    await page.goto("/bookings");
    await expect(page.getByRole("heading", { level: 1, name: "Today at a glance" })).toBeVisible();
  });

  test("a signed-in guest who opens sign-in goes to booking", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST });
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
  });

  test("an unknown address falls back to the home page", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST });
    await page.goto("/does-not-exist");
    await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
  });
});

test.describe("error states name the problem", () => {
  test("bookings fail to load", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST, failPaths: ["/reservations"] });
    await page.goto("/bookings");
    await expect(page.getByRole("alert")).toHaveText("We couldn't load your bookings: Internal server error");
  });

  test("sittings fail to load", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST, failPaths: ["/availability"] });
    await page.goto("/");
    await expect(page.getByRole("alert")).toHaveText("We couldn't load sittings: Internal server error");
  });

  test("menu fails to load", async ({ page }) => {
    await mockApi(page, { failPaths: ["/menu"] });
    await page.goto("/menu");
    await expect(page.getByRole("alert")).toHaveText("We couldn't load the menu: Internal server error");
  });

  test("admin numbers fail to load", async ({ page }) => {
    await mockApi(page, { signedInAs: ADMIN, failPaths: ["/admin/stats"] });
    await page.goto("/admin");
    await expect(page.getByRole("alert")).toHaveText("We couldn't load the numbers: Internal server error");
  });

  test("profile save fails", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST, failPaths: ["PATCH /me"] });
    await page.goto("/profile");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByRole("alert")).toHaveText("Internal server error");
  });

  test("a reschedule the server rejects keeps the dialog open with the reason", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST, reservations: [upcoming], failPaths: ["/reservations/r-up"] });
    await page.goto("/bookings");
    await page.getByRole("button", { name: "Change time for RSV-UPC0M1" }).click();
    await page.getByRole("button", { name: "Save new time" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toHaveText("Internal server error");
  });
});

test.describe("dialogs and pages reached directly", () => {
  test("the keep buttons close dialogs without changing anything", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST, reservations: [upcoming] });
    await page.goto("/bookings");
    await page.getByRole("button", { name: "Change time for RSV-UPC0M1" }).click();
    await page.getByRole("button", { name: "Keep current time" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: "Release booking RSV-UPC0M1" }).click();
    await page.getByRole("button", { name: "Keep booking" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Confirmed")).toBeVisible();
  });

  test("the reschedule dialog starts at the booking's current sitting", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST, reservations: [upcoming] });
    await page.goto("/bookings");
    await page.getByRole("button", { name: "Change time for RSV-UPC0M1" }).click();
    await expect(page.getByRole("dialog").getByLabel("Sitting")).toHaveValue("19:30");
    await expect(page.getByRole("dialog").getByLabel("Date")).toHaveValue(inDays(5));
  });

  test("a confirmation page opened from a link loads the booking", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST, reservations: [upcoming] });
    await page.goto("/bookings/r-up/confirmed");
    await expect(page.getByText("RSV-UPC0M1")).toBeVisible();
  });

  test("a confirmation page for an unknown booking says so", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST });
    await page.goto("/bookings/missing/confirmed");
    await expect(page.getByRole("alert")).toHaveText("Reservation not found");
  });

  test("the booking summary counts VIP rooms and blocks sittings too small for the party", async ({ page }) => {
    await mockApi(page, { signedInAs: GUEST });
    await page.goto("/");
    await page.getByRole("radio", { name: "VIP Private Dining" }).check();
    await page.getByLabel("Guests").fill("27");
    const summary = page.getByRole("region", { name: "Your sitting" });
    await expect(summary.getByText("Rooms")).toBeVisible();
    await expect(summary).toContainText("3");
    await page.getByLabel("Guests").fill("50");
    await expect(page.getByRole("radio", { name: /^11:00/ })).toBeEnabled();
  });
});

test.describe("admin extras", () => {
  const many: AdminReservation[] = Array.from({ length: 25 }, (_, i) => ({
    ...makeReservation({ id: `p-${i}`, code: `RSV-PAGE${String(i).padStart(2, "0")}` }),
    customer: { name: `Guest ${i}`, email: `g${i}@example.com`, phone: null },
  }));

  test("the booking log pages through results", async ({ page }) => {
    await mockApi(page, { signedInAs: ADMIN, adminRows: many });
    await page.goto("/admin/logs");
    await expect(page.getByText("Page 1 of 2 · 25 bookings")).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("button", { name: "View RSV-PAGE24" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByRole("button", { name: "View RSV-PAGE00" })).toBeVisible();
  });

  test("JSON export downloads a .json file", async ({ page }) => {
    await mockApi(page, { signedInAs: ADMIN, adminRows: many });
    await page.goto("/admin/logs");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export JSON" }).click();
    expect((await download).suggestedFilename()).toBe("reservations.json");
  });

  test("changing the day view date and branch asks for those numbers", async ({ page }) => {
    const api = await mockApi(page, { signedInAs: ADMIN });
    await page.goto("/admin");
    await page.getByLabel("Date").fill(inDays(3));
    await page.getByLabel("Restaurant").selectOption("BRANCH_2");
    await expect.poll(() => api.adminQueries.at(-1)?.toString()).toBe(`date=${inDays(3)}&branch=BRANCH_2`);
  });

  test("the drawer shows when a cancelled booking was cancelled", async ({ page }) => {
    const cancelled: AdminReservation = {
      ...makeReservation({ id: "c-1", code: "RSV-CXL999", status: "CANCELLED", cancelledAt: "2029-12-21T05:00:00.000Z" }),
      customer: { name: "Dewi", email: "dewi@example.com", phone: null },
    };
    await mockApi(page, { signedInAs: ADMIN, adminRows: [cancelled] });
    await page.goto("/admin/logs");
    await page.getByRole("button", { name: "View RSV-CXL999" }).click();
    const drawer = page.getByRole("dialog", { name: "RSV-CXL999" });
    await expect(drawer.getByRole("heading", { name: "RSV-CXL999" })).toBeInViewport();
    await expect(drawer.getByRole("heading", { name: "RSV-CXL999" })).toBeFocused();
    await expect(drawer.getByText("Cancelled at")).toBeVisible();
    await expect(drawer.getByText("Not given")).toBeVisible();
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(drawer).toBeHidden();
  });
});
