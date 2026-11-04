import type { UpdateMeInput, User } from "../types/api";
import { api, json } from "./client";

export function getMe(): Promise<User> {
  return api<User>("/me");
}

export function updateMe(input: UpdateMeInput): Promise<User> {
  return api<User>("/me", { method: "PATCH", body: json(input) });
}
