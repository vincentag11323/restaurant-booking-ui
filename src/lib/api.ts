import type { AuthResponse } from "../types/api";

const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let onSessionExpired: () => void = () => {};

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${BASE}/api${path}`, { ...init, headers, credentials: "include" });
}

export async function refreshSession(): Promise<AuthResponse | null> {
  const res = await fetch(`${BASE}/api/auth/refresh`, { method: "POST", credentials: "include" });
  if (!res.ok) return null;
  const body: AuthResponse = await res.json();
  accessToken = body.accessToken;
  return body;
}

/** Calls the API; on 401 it refreshes the access token once and retries. */
export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  let res = await send(path, init);
  if (res.status === 401 && accessToken && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      res = await send(path, init);
    } else {
      onSessionExpired();
    }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? "Something went wrong. Please try again.");
  }
  return res;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await request(path, init)).json();
}

export const json = (body: unknown) => JSON.stringify(body);
