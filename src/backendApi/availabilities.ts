import type { Branch, Sector, Slot } from "../types/api";
import { api } from "./client";

export function listAvailabilities(branch: Branch, sector: Sector, date: string): Promise<Slot[]> {
  return api<Slot[]>(`/availability?branch=${branch}&sector=${sector}&date=${date}`);
}
