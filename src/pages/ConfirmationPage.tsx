import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ErrorBanner, PlaceCard } from "../components/ui";
import { api } from "../lib/api";
import { BRANCH_LABEL, SECTOR_LABEL, formatSlot, tableSummary } from "../lib/format";
import type { Reservation } from "../types/api";

export function ConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const [reservation, setReservation] = useState<Reservation | null>((location.state as Reservation | null) ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservation) api<Reservation>(`/reservations/${id}`).then(setReservation).catch((err: Error) => setError(err.message));
  }, [id, reservation]);

  if (error) return <ErrorBanner message={error} />;
  if (!reservation) return <p role="status" className="text-muted">Loading your booking…</p>;

  return (
    <section className="card mx-auto max-w-lg space-y-6 p-6 text-center sm:p-8">
      <h1 className="text-4xl">Your table is held</h1>
      <div>
        <p className="mb-2 text-sm text-muted">Show this code to the host when you arrive</p>
        <PlaceCard code={reservation.code} />
      </div>
      <dl className="space-y-2 text-left">
        <div className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted">When</dt><dd className="font-semibold">{formatSlot(reservation.slotStart, reservation.slotEnd)}</dd></div>
        <div className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted">Where</dt><dd>{BRANCH_LABEL[reservation.branch]}, {SECTOR_LABEL[reservation.sector]}</dd></div>
        <div className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted">Guests</dt><dd>{reservation.partySize}</dd></div>
        <div className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted">Seating</dt><dd>{tableSummary(reservation.sector, reservation.tableIds)}</dd></div>
        {reservation.specialRequests && (
          <div className="flex flex-wrap justify-between gap-x-4"><dt className="text-muted">Notes</dt><dd>{reservation.specialRequests}</dd></div>
        )}
      </dl>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link to="/bookings" className="btn-primary">See my bookings</Link>
        <Link to="/" className="btn-quiet">Book another table</Link>
      </div>
    </section>
  );
}
