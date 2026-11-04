import { expect, test } from "@playwright/test";
import { GUEST, PASSWORD, inDays, mockApi } from "./mockApi";

test("a guest signs in, books a Main Hall table and sees the reservation code", async ({ page }) => {
  const api = await mockApi(page);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("Email").fill(GUEST.email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
  await page.getByRole("radio", { name: "Branch 2" }).check();
  await page.getByRole("radio", { name: "Main Dining Hall" }).check();
  await page.getByLabel("Date").fill(inDays(10));
  await page.getByRole("radio", { name: /^19:30/ }).check();
  await page.getByLabel("Guests").fill("5");
  await page.getByLabel("Special requests or dietary notes").fill("One guest is vegetarian");
  await page.getByRole("button", { name: "Hold this table" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Your table is held" })).toBeVisible();
  await expect(page.getByText("RSV-7K3Q9X")).toBeVisible();
  await expect(page.getByText("3 tables: B2-MH-01, B2-MH-02, B2-MH-03")).toBeVisible();
  expect(api.created).toEqual([
    { branch: "BRANCH_2", sector: "MAIN_HALL", date: inDays(10), startTime: "19:30", partySize: 5, specialRequests: "One guest is vegetarian" },
  ]);
});

test("full slots cannot be picked and a capacity error from the server is shown", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST, fullSlots: ["17:00"], rejectCapacityAt: "19:30" });
  await page.goto("/");
  await page.getByLabel("Date").fill(inDays(10));

  await expect(page.getByRole("radio", { name: /^17:00/ })).toBeDisabled();
  await expect(page.getByText("Fully booked")).toBeVisible();

  await page.getByRole("radio", { name: /^19:30/ }).check();
  await page.getByLabel("Guests").fill("2");
  await page.getByRole("button", { name: "Hold this table" }).click();
  await expect(page.getByRole("alert")).toHaveText("Insufficient capacity for the selected slot");
});

test("the booking form explains invalid party sizes before calling the API", async ({ page }) => {
  const api = await mockApi(page, { signedInAs: GUEST });
  await page.goto("/");
  await page.getByLabel("Date").fill(inDays(10));
  await page.getByRole("radio", { name: /^11:00/ }).check();
  await page.getByLabel("Guests").fill("51");
  await page.getByRole("button", { name: "Hold this table" }).click();
  await expect(page.getByText("Party size must be between 1 and 50")).toBeVisible();
  expect(api.created).toEqual([]);
});
