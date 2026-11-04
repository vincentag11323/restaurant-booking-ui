const BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onSessionExpired: () => void = () => {};

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

const OFFLINE_MESSAGE = "You're offline. Check your connection and try again.";

/** fetch() only rejects when the request never reached a server, i.e. no network. */
async function fetchOrOffline(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  }
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetchOrOffline(`${BASE}/api${path}`, { ...init, headers, credentials: "include" });
}

/** Calls the API with the session cookie. A 401 outside /auth/ means the session has ended: no retry, sign in again. */
export async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await send(path, init);
  if (res.status === 401 && !path.startsWith("/auth/")) onSessionExpired();
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
