import type { MenuItem, MenuType } from "../types/api";
import { api } from "./client";

export function listMenu(type: MenuType): Promise<MenuItem[]> {
  return api<MenuItem[]>(`/menu?type=${type}`);
}

export function listRecommendations(): Promise<MenuItem[]> {
  return api<MenuItem[]>("/menu/recommendations");
}
