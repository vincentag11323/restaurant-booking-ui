import { expect, test, type Page } from "@playwright/test";
import { inDays, mockApi } from "./mock-api";

const draft = { branch: "BRANCH_1", sector: "MAIN_HALL", date: inDays(5), startTime: "19:30", partySize: 4 };

/** Fakes the assistant's POST /chat; each reply is taken in order. */
async function mockAgent(page: Page, replies: { status?: number; body: unknown }[]) {
  const sent: Record<string, unknown>[] = [];
  await page.route("**/agent/chat", async (route) => {
    sent.push(route.request().postDataJSON());
    const next = replies.shift() ?? { body: { reply: "…" } };
    await route.fulfill({ status: next.status ?? 200, contentType: "application/json", body: JSON.stringify(next.body) });
  });
  return sent;
}

async function start(page: Page, email = "guest@example.com") {
  await page.goto("/chat");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Start chatting" }).click();
}

test("a visitor books through chat: read-back, Book it, reservation code", async ({ page }) => {
  await mockApi(page);
  const sent = await mockAgent(page, [
    { body: { reply: "Here's the booking: 4 guests at Branch 1, Main Dining Hall. Shall I book it?", pendingBooking: { draft, token: "t1" } } },
    { body: { reply: "You're booked. Your code is RSV-CHAT01.", booking: { code: "RSV-CHAT01", slotStart: "", slotEnd: "", tableIds: [] } } },
  ]);
  await start(page);
  await page.getByLabel("Message").fill("Table for 4 at Branch 1 Main Hall at 19:30");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Shall I book it?")).toBeVisible();
  await page.getByRole("button", { name: "Book it" }).click();
  await expect(page.getByRole("region", { name: "Your booking" }).getByText("RSV-CHAT01")).toBeVisible();
  expect(sent[0]).toEqual({ contact: { email: "guest@example.com" }, messages: [{ role: "user", content: "Table for 4 at Branch 1 Main Hall at 19:30" }] });
  expect(sent[1]).toMatchObject({ confirm: { draft, token: "t1" } });
  expect((sent[1].messages as unknown[]).at(-1)).toEqual({ role: "user", content: "Yes, book it." });
});

test("alternatives are offered as buttons and confirm the chosen one", async ({ page }) => {
  await mockApi(page);
  const alt = { draft: { ...draft, startTime: "17:00" }, token: "alt-1" };
  const sent = await mockAgent(page, [
    { body: { reply: "That sitting is full. These have space:", alternatives: [alt] } },
    { body: { reply: "You're booked.", booking: { code: "RSV-ALT001", slotStart: "", slotEnd: "", tableIds: [] } } },
  ]);
  await start(page);
  await page.getByLabel("Message").fill("VIP for 10 at 19:30");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByRole("button", { name: `Book option 1: 17:00 on ${draft.date}` }).click();
  await expect(page.getByText("RSV-ALT001")).toBeVisible();
  expect(sent[1]).toMatchObject({ confirm: alt });
});

test("the assistant's failures are shown as it words them", async ({ page }) => {
  await mockApi(page);
  await mockAgent(page, [{ status: 503, body: { reply: "The assistant is busy. Please try again in a moment." } }]);
  await start(page);
  await page.getByLabel("Message").fill("Table please");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("alert")).toHaveText("The assistant is busy. Please try again in a moment.");
});

test("an email is required before chatting, and the AI notice is shown", async ({ page }) => {
  await mockApi(page);
  await page.goto("/chat");
  await expect(page.getByText("Messages are processed by an AI service to make your booking.")).toBeVisible();
  await page.getByRole("button", { name: "Start chatting" }).click();
  await expect(page.getByRole("alert")).toHaveText("Please enter your email so we can hold the booking for you.");
  await page.getByLabel("Email").fill("guest@example.com");
  await page.getByLabel("Phone (optional)").fill("call me");
  await page.getByRole("button", { name: "Start chatting" }).click();
  await expect(page.getByRole("alert")).toHaveText("That phone number doesn't look right.");
});

test("visitors and guests both get an Ask tab", async ({ page }) => {
  await mockApi(page);
  await page.goto("/menu");
  await page.getByRole("link", { name: "Ask" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ask the assistant" })).toBeVisible();
});
