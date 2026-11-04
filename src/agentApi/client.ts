// Calls the booking assistant (resortos-booking-agent). Separate from src/backendApi on purpose:
// no auth here, the guest's email travels with each message.
import type { ChatMessage, ChatResponse, PendingBooking } from "../types/chat";

// Default is same origin: Vite proxies /agents to the assistant.
const BASE = import.meta.env.VITE_AGENT_URL ?? "";

export interface Contact {
  email: string;
  phone?: string;
}

export class AgentError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** One chat turn. `confirm` books a read-back or alternative exactly as shown. */
export async function sendChat(contact: Contact, messages: ChatMessage[], confirm?: PendingBooking): Promise<ChatResponse> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/agents/users/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact, messages, ...(confirm ? { confirm } : {}) }),
    });
  } catch {
    throw new AgentError(0, "You're offline. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => ({}))) as Partial<ChatResponse>;
  // The assistant answers every failure with a readable `reply` (busy, limits, expired confirmation).
  if (!res.ok) throw new AgentError(res.status, body.reply ?? "The assistant had a problem. Please try again.");
  return body as ChatResponse;
}
