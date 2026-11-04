import type { AuthResponse, RegisterInput } from "../types/api";
import { api, json } from "./client";

export function register(input: RegisterInput): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/register", { method: "POST", body: json(input) });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/login", { method: "POST", body: json({ email, password }) });
}

export async function logout(): Promise<void> {
  await api("/auth/logout", { method: "POST" });
}
