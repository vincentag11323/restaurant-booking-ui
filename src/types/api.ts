// Mirrors requirements/api_spec.md. Kept separate from the backend on purpose (loose coupling).

export type Role = "USER" | "ADMIN";
export type Branch = "BRANCH_1" | "BRANCH_2";
export type Sector = "MAIN_HALL" | "VIP_WING";
export type ReservationStatus = "CONFIRMED" | "SEATED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type MenuType = "SEASONAL_FINE_DINING" | "A_LA_CARTE";
/** APP = the guest booked in the app; AGENT = the AI booking assistant booked on their behalf. */
export type BookingSource = "APP" | "AGENT";
export type SlotStartTime = "11:00" | "13:30" | "17:00" | "19:30";

export const SLOT_START_TIMES: SlotStartTime[] = ["11:00", "13:30", "17:00", "19:30"];

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  allergies: string[];
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Slot {
  startTime: SlotStartTime;
  slotStart: string;
  slotEnd: string;
  totalUnits: number;
  freeUnits: number;
  bookable: boolean;
}

export interface Reservation {
  id: string;
  code: string;
  branch: Branch;
  sector: Sector;
  slotStart: string;
  slotEnd: string;
  partySize: number;
  specialRequests: string | null;
  status: ReservationStatus;
  source: BookingSource;
  tableIds: string[];
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
}

export interface AdminReservation extends Reservation {
  customer: { name: string; email: string; phone: string | null };
}

export interface AdminReservationPage {
  items: AdminReservation[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Stats {
  date: string;
  totalBookings: number;
  agentBookings: number;
  totalCovers: number;
  cancellations: number;
  utilization: { sector: Sector; usedUnits: number; capacityUnits: number; rate: number }[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  type: MenuType;
  priceCents: number;
  allergens: string[];
  chefPick: boolean;
}

export interface CreateReservationInput {
  branch: Branch;
  sector: Sector;
  date: string;
  startTime: SlotStartTime;
  partySize: number;
  specialRequests?: string;
}

export interface RescheduleInput {
  date: string;
  startTime: SlotStartTime;
  partySize?: number;
}
