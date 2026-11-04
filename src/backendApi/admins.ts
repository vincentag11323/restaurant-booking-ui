import type { AdminReservationPage, Branch, Stats } from "../types/api";
import { api, request } from "./client";

export function getStats(date: string, branch?: Branch): Promise<Stats> {
  return api<Stats>(`/admin/stats?date=${date}${branch ? `&branch=${branch}` : ""}`);
}

export function listAdminReservations(filters: URLSearchParams, page: number, pageSize: number): Promise<AdminReservationPage> {
  return api<AdminReservationPage>(`/admin/reservations?${filters}&page=${page}&pageSize=${pageSize}`);
}

/** Returns the raw response: the caller saves its body as a file. */
export function exportAdminReservations(filters: URLSearchParams, format: "csv" | "json"): Promise<Response> {
  return request(`/admin/reservations/export?${filters}&format=${format}`);
}
