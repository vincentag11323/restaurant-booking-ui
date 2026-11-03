import { expect, test } from "@playwright/test";
import type { AdminReservation } from "../../src/types/api";
import { ADMIN, makeReservation, mockApi } from "./mock-api";

const viaAssistant: AdminReservation = {
  ...makeReservation({ id: "ai-1", code: "RSV-AIBOOK", source: "AGENT" }),
  customer: { name: "dewi", email: "dewi@example.com", phone: null },
};
const viaApp: AdminReservation = {
  ...makeReservation({ id: "app-1", code: "RSV-APPBK1" }),
  customer: { name: "Budi Santoso", email: "budi@example.com", phone: null },
};

test("assistant bookings are labelled in the log and the detail sheet", async ({ page }) => {
  await mockApi(page, { signedInAs: ADMIN, adminRows: [viaAssistant, viaApp] });
  await page.goto("/admin/logs");

  const aiCard = page.getByRole("listitem").filter({ hasText: "RSV-AIBOOK" });
  const appCard = page.getByRole("listitem").filter({ hasText: "RSV-APPBK1" });
  await expect(aiCard.getByText("Booked by AI assistant")).toBeVisible();
  await expect(appCard.getByText("Booked by AI assistant")).toHaveCount(0);

  await page.getByRole("button", { name: "View RSV-AIBOOK" }).click();
  const sheet = page.getByRole("dialog", { name: "RSV-AIBOOK" });
  await expect(sheet.getByText("AI assistant, on behalf of dewi@example.com")).toBeVisible();
  await sheet.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "View RSV-APPBK1" }).click();
  await expect(page.getByRole("dialog", { name: "RSV-APPBK1" }).getByText("Guest, in the app")).toBeVisible();
});

test("the log can be filtered to assistant bookings", async ({ page }) => {
  const api = await mockApi(page, { signedInAs: ADMIN, adminRows: [viaAssistant, viaApp] });
  await page.goto("/admin/logs");
  await page.getByLabel("Booked by").selectOption("AGENT");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByRole("button", { name: "View RSV-AIBOOK" })).toBeVisible();
  await expect(page.getByRole("button", { name: "View RSV-APPBK1" })).toBeHidden();
  expect(api.adminQueries.at(-1)?.get("source")).toBe("AGENT");
});

test("the day view says how many bookings came through the assistant", async ({ page }) => {
  await mockApi(page, { signedInAs: ADMIN });
  await page.goto("/admin");
  await expect(page.getByTestId("stat-bookings")).toContainText("of which 1 via AI assistant");
});
