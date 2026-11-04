// This app's copy of the booking assistant's POST /agents/users/chats shapes (resortos-booking-agent/src/types/chat.ts).
import type { Branch, Sector, SlotStartTime } from "./api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BookingDraft {
  branch: Branch;
  sector: Sector;
  date: string;
  startTime: SlotStartTime;
  partySize: number;
  specialRequests?: string;
}

/** A read-back the guest can confirm; the token makes sure exactly this is booked. */
export interface PendingBooking {
  draft: BookingDraft;
  token: string;
}

export interface ChatResponse {
  reply: string;
  pendingBooking?: PendingBooking;
  alternatives?: PendingBooking[];
  booking?: { code: string; slotStart: string; slotEnd: string; tableIds: string[] };
}
