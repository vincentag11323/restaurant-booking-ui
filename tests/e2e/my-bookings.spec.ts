import { expect, test } from "@playwright/test";
import { GUEST, inDays, makeReservation, mockApi, slotTimes } from "./mock-api";

const upcoming = makeReservation({ id: "r-up", code: "RSV-UPC0M1", ...slotTimes(inDays(5), "19:30") });
const past = makeReservation({ id: "r-past", code: "RSV-PAST22", status: "COMPLETED", ...slotTimes("2026-01-10", "11:00") });

test("upcoming and past bookings are listed separately", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST, reservations: [upcoming, past] });
  await page.goto("/bookings");
  await expect(page.getByRole("heading", { level: 1, name: "My bookings" })).toBeVisible();
  await expect(page.getByText("RSV-UPC0M1")).toBeVisible();
  await expect(page.getByText("RSV-PAST22")).toBeHidden();

  await page.getByRole("tab", { name: "Past" }).click();
  await expect(page.getByText("RSV-PAST22")).toBeVisible();
  await expect(page.getByText("Completed")).toBeVisible();
});

test("a guest moves a booking to another sitting", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST, reservations: [upcoming] });
  await page.goto("/bookings");
  await page.getByRole("button", { name: "Change time for RSV-UPC0M1" }).click();

  const dialog = page.getByRole("dialog", { name: "Change time" });
  await dialog.getByLabel("Date").fill(inDays(6));
  await dialog.getByLabel("Sitting").selectOption("13:30");
  await dialog.getByLabel("Guests").fill("6");
  await dialog.getByRole("button", { name: "Save new time" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("6 guests")).toBeVisible();
  await expect(page.getByText(/13:30 – 16:00/)).toBeVisible();
});

test("the reschedule dialog closes with Escape", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST, reservations: [upcoming] });
  await page.goto("/bookings");
  await page.getByRole("button", { name: "Change time for RSV-UPC0M1" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("a guest cancels a booking after confirming", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST, reservations: [upcoming] });
  await page.goto("/bookings");
  await page.getByRole("button", { name: "Release booking RSV-UPC0M1" }).click();
  const dialog = page.getByRole("dialog", { name: "Release this table?" });
  await dialog.getByRole("button", { name: "Release table" }).click();

  await expect(page.getByText("Cancelled")).toBeVisible();
  await expect(page.getByRole("button", { name: "Release booking RSV-UPC0M1" })).toBeHidden();
});

test("an empty list points the guest to booking", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST });
  await page.goto("/bookings");
  await expect(page.getByText("No upcoming bookings yet.")).toBeVisible();
  await page.getByRole("link", { name: "Reserve a table" }).click();
  await expect(page).toHaveURL(/\/$/);
});
