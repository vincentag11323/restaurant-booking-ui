import type { Branch, Sector } from "../types/api";

// Restaurant local time is UTC+07:00 (Asia/Jakarta, no DST), matching the API's RESTAURANT_UTC_OFFSET.
const TIME_ZONE = "Asia/Jakarta";

const dayFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const stampFormat = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
// Grouping only: currency style output differs by engine (Safari drops the space), so "Rp " is added here.
const priceFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const BRANCH_LABEL: Record<Branch, string> = { BRANCH_1: "Branch 1", BRANCH_2: "Branch 2" };
export const SECTOR_LABEL: Record<Sector, string> = { MAIN_HALL: "Main Dining Hall", VIP_WING: "VIP Private Dining" };

/** "Sat 24 Dec, 19:30 – 22:00" */
export function formatSlot(slotStart: string, slotEnd: string): string {
  const start = new Date(slotStart);
  return `${dayFormat.format(start)}, ${timeFormat.format(start)} – ${timeFormat.format(new Date(slotEnd))}`;
}

/** Restaurant-local "HH:MM" of a moment, e.g. a slot start. */
export function localTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function formatStamp(iso: string): string {
  return stampFormat.format(new Date(iso));
}

/** Restaurant-local "YYYY-MM-DD" for a moment (defaults to now). */
export function localDateKey(date: Date = new Date()): string {
  return dateKeyFormat.format(date);
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatPrice(priceCents: number): string {
  return `Rp ${priceFormat.format(priceCents / 100)}`;
}

export function tableSummary(sector: Sector, tableIds: string[]): string {
  const unit = sector === "MAIN_HALL" ? "table" : "room";
  return `${tableIds.length} ${unit}${tableIds.length === 1 ? "" : "s"}: ${tableIds.join(", ")}`;
}
