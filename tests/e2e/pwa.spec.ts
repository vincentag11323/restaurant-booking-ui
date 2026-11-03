import { expect, test } from "@playwright/test";
import { GUEST, mockApi } from "./mock-api";

test.describe("installable app", () => {
  test.use({ serviceWorkers: "allow" });

  test("links a valid web app manifest with home-screen icons", async ({ page, request }) => {
    await page.goto("/login");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({
      name: "ResortOS Dining",
      short_name: "ResortOS",
      display: "standalone",
      start_url: "/",
      theme_color: "#1e4636",
      background_color: "#e4eff7",
    });
    const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}${i.purpose ? ` ${i.purpose}` : ""}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512", "512x512 maskable"]));
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1e4636");
  });

  test("registers a service worker and opens with no network", async ({ page, context }) => {
    await page.goto("/login");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Welcome back" })).toBeVisible();
  });
});

test("API calls that fail for lack of network say the guest is offline", async ({ page }) => {
  await mockApi(page, { signedInAs: GUEST });
  await page.route("**/api/reservations", (route) => route.abort("internetdisconnected"));
  await page.goto("/bookings");
  await expect(page.getByRole("alert")).toHaveText("We couldn't load your bookings: You're offline. Check your connection and try again.");
});
