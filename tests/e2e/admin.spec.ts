import { expect, test } from "@playwright/test";
import type { AdminReservation } from "../../src/types/api";
import { ADMIN, GUEST, PASSWORD, inDays, makeReservation, mockApi, slotTimes } from "./mock-api";

const rows: AdminReservation[] = [
  {
    ...makeReservation({ id: "a-1", code: "RSV-ADM1N1", specialRequests: "Anniversary, quiet corner", ...slotTimes(inDays(2), "19:30") }),
    customer: { name: "Ayu Lestari", email: "ayu@example.com", phone: "+62 812 1111 2222" },
  },
  {
    ...makeReservation({ id: "a-2", code: "RSV-CXL222", status: "CANCELLED", sector: "VIP_WING", tableIds: ["B1-VIP-1"], partySize: 9 }),
    customer: { name: "Budi Santoso", email: "budi@example.com", phone: null },
  },
];

test("an admin signs in and sees today's real numbers", async ({ page }) => {
  await mockApi(page, { adminRows: rows });
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Today at a glance" })).toBeVisible();
  await expect(page.getByTestId("stat-bookings")).toContainText("2");
  await expect(page.getByTestId("stat-covers")).toContainText("9");
  await expect(page.getByTestId("stat-cancellations")).toContainText("1");
  await expect(page.getByText("5 of 400 table-sittings")).toBeVisible();
});

test("the booking log filters, searches and opens a read-only detail drawer", async ({ page }) => {
  const api = await mockApi(page, { signedInAs: ADMIN, adminRows: rows });
  await page.goto("/admin/logs");
  await expect(page.getByRole("button", { name: "View RSV-ADM1N1" })).toBeVisible();

  await page.getByLabel("Status").selectOption("CANCELLED");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("button", { name: "View RSV-ADM1N1" })).toBeHidden();
  await expect(page.getByRole("button", { name: "View RSV-CXL222" })).toBeVisible();
  expect(api.adminQueries.at(-1)?.get("status")).toBe("CANCELLED");

  await page.getByLabel("Status").selectOption("");
  await page.getByLabel("Search").fill("ayu");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("button", { name: "View RSV-ADM1N1" }).click();

  const drawer = page.getByRole("dialog", { name: "RSV-ADM1N1" });
  await expect(drawer.getByText("Anniversary, quiet corner")).toBeVisible();
  await expect(drawer.getByText("+62 812 1111 2222")).toBeVisible();
  await expect(drawer.getByRole("button", { name: /cancel|edit|delete/i })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
});

test("a slow earlier filter never overwrites the latest results", async ({ page }) => {
  await mockApi(page, { signedInAs: ADMIN, adminRows: rows, slowStatus: { status: "CANCELLED", ms: 800 } });
  await page.goto("/admin/logs");
  await page.getByLabel("Status").selectOption("CANCELLED");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await page.getByLabel("Status").selectOption("CONFIRMED");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("button", { name: "View RSV-ADM1N1" })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.getByRole("button", { name: "View RSV-ADM1N1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View RSV-CXL222" })).toBeHidden();
});

test("export downloads the filtered log", async ({ page }) => {
  await mockApi(page, { signedInAs: ADMIN, adminRows: rows });
  await page.goto("/admin/logs");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toBe("reservations.csv");
});

test("a filter with no matches says so", async ({ page }) => {
  await mockApi(page, { signedInAs: ADMIN, adminRows: rows });
  await page.goto("/admin/logs");
  await page.getByLabel("Search").fill("nobody");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("No bookings match these filters.")).toBeVisible();
});

test("guests cannot open admin pages", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST });
  await page.goto("/admin/logs");
  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
});
