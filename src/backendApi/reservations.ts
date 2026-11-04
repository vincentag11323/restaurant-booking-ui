import type { CreateReservationInput, RescheduleInput, Reservation } from "../types/api";
import { api, json } from "./client";

export function listMyReservations(): Promise<Reservation[]> {
  return api<Reservation[]>("/reservations");
}

export function getMyReservation(id: string): Promise<Reservation> {
  return api<Reservation>(`/reservations/${id}`);
}

export function createReservation(input: CreateReservationInput): Promise<Reservation> {
  return api<Reservation>("/reservations", { method: "POST", body: json(input) });
}

export function rescheduleReservation(id: string, input: RescheduleInput): Promise<Reservation> {
  return api<Reservation>(`/reservations/${id}`, { method: "PATCH", body: json(input) });
}

export function cancelReservation(id: string): Promise<Reservation> {
  return api<Reservation>(`/reservations/${id}`, { method: "DELETE" });
}
