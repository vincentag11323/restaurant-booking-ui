import { expect, test } from "@playwright/test";
import { GUEST, mockApi } from "./mockApi";

test("a new guest registers and lands on booking", async ({ page }) => {
  await mockApi(page);
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Budi Santoso");
  await page.getByLabel("Email").fill("budi@example.com");
  await page.getByLabel("Phone (optional)").fill("+62 811 2233 4455");
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reserve a table" })).toBeVisible();
});

test("registration explains a short password and a taken email", async ({ page }) => {
  await mockApi(page);
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Ayu");
  await page.getByLabel("Email").fill(GUEST.email);
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();

  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("alert")).toHaveText("Email is already registered");
});

test("a wrong password shows the server's message", async ({ page }) => {
  await mockApi(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(GUEST.email);
  await page.getByLabel("Password").fill("not-it");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
});

test("a guest updates allergies and the menu marks what is safe for them", async ({ page }) => {
  await mockApi(page, { signedInAs: { ...GUEST, allergies: [] } });
  await page.goto("/profile");
  await page.getByLabel("Allergies").fill("fish, Dairy");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile saved");

  await page.getByRole("link", { name: "Menu" }).click();
  const safe = page.getByRole("region", { name: "Safe for you" });
  await expect(safe.getByText("Seared Scallops")).toBeVisible();
  await expect(safe.getByText("Barramundi")).toBeHidden();
  await expect(safe.getByText("Beef Steak")).toBeHidden();
});

test("visitors can browse the menu by type without signing in", async ({ page }) => {
  await mockApi(page);
  await page.goto("/menu");
  await expect(page.getByRole("region", { name: "Safe for you" })).toBeHidden();
  await page.getByRole("tab", { name: "Seasonal fine dining" }).click();
  await expect(page.getByText("Seared Scallops")).toBeVisible();
  await expect(page.getByText("Beef Steak")).toBeHidden();
  await expect(page.getByText("Rp 320.000")).toBeVisible();
});
