import type { ReactNode } from "react";
import type { ReservationStatus } from "../types/api";

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-[var(--radius-control)] border border-danger bg-white px-3 py-2 text-danger">
      {message}
    </p>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-4xl">{title}</h1>
      {lead && <p className="mt-2 max-w-prose text-muted">{lead}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<ReservationStatus, string> = {
  CONFIRMED: "border-pine text-pine",
  SEATED: "border-pine text-pine",
  COMPLETED: "border-muted text-muted",
  CANCELLED: "border-danger text-danger",
  NO_SHOW: "border-danger text-danger",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

/** Real booking status, so the label carries state, not decoration. */
export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`inline-block rounded-[var(--radius-control)] border px-2 py-0.5 text-sm font-semibold ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PlaceCard({ code, size = "lg" }: { code: string; size?: "lg" | "sm" }) {
  return <p className={`place-card ${size === "lg" ? "text-4xl" : "text-xl"}`}>{code}</p>;
}
