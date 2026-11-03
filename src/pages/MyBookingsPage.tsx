import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router";
import { Dialog } from "../components/Dialog";
import { ErrorBanner, PageTitle, PlaceCard, StatusBadge } from "../components/ui";
import { api, json } from "../backend-api/client";
import { BRANCH_LABEL, SECTOR_LABEL, addDays, formatSlot, localDateKey, localTime, tableSummary } from "../lib/format";
import { type Reservation, SLOT_START_TIMES, type SlotStartTime } from "../types/api";

type Tab = "upcoming" | "past";

function canChange(r: Reservation) {
  return r.status === "CONFIRMED" && new Date(r.slotStart) > new Date();
}

function RescheduleDialog({ reservation, onClose, onSaved }: { reservation: Reservation; onClose: () => void; onSaved: (r: Reservation) => void }) {
  const today = localDateKey();
  const [date, setDate] = useState(localDateKey(new Date(reservation.slotStart)));
  const [startTime, setStartTime] = useState<SlotStartTime>(localTime(reservation.slotStart) as SlotStartTime);
  const [partySize, setPartySize] = useState(String(reservation.partySize));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api<Reservation>(`/reservations/${reservation.id}`, {
        method: "PATCH",
        body: json({ date, startTime, partySize: Number(partySize) }),
      });
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog title="Change time" open onClose={onClose}>
      <p className="text-muted">We'll check the new sitting has room before releasing your current table.</p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="r-date" className="field-label">Date</label>
          <input id="r-date" type="date" className="input" required value={date} min={today} max={addDays(today, 60)} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="r-slot" className="field-label">Sitting</label>
          <select id="r-slot" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value as SlotStartTime)}>
            {SLOT_START_TIMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="r-party" className="field-label">Guests</label>
          <input id="r-party" type="number" min={1} max={50} required className="input" value={partySize} onChange={(e) => setPartySize(e.target.value)} />
        </div>
        <ErrorBanner message={error} />
        <div className="flex flex-col-reverse gap-2">
          <button type="button" className="btn-quiet" onClick={onClose}>Keep current time</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Checking…" : "Save new time"}</button>
        </div>
      </form>
    </Dialog>
  );
}

function CancelDialog({ reservation, onClose, onCancelled }: { reservation: Reservation; onClose: () => void; onCancelled: (r: Reservation) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      onCancelled(await api<Reservation>(`/reservations/${reservation.id}`, { method: "DELETE" }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog title="Release this table?" open onClose={onClose}>
      <p>
        {formatSlot(reservation.slotStart, reservation.slotEnd)} for {reservation.partySize}. Other guests will be able to book it.
      </p>
      <ErrorBanner message={error} />
      <div className="flex flex-col-reverse gap-2">
        <button type="button" className="btn-quiet" onClick={onClose}>Keep booking</button>
        <button type="button" className="btn-danger" onClick={confirm} disabled={busy}>{busy ? "Releasing…" : "Release table"}</button>
      </div>
    </Dialog>
  );
}

export function MyBookingsPage() {
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [rescheduling, setRescheduling] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState<Reservation | null>(null);

  useEffect(() => {
    api<Reservation[]>("/reservations").then(setReservations).catch((err: Error) => setError(err.message));
  }, []);

  const replace = (updated: Reservation) => setReservations((list) => list?.map((r) => (r.id === updated.id ? updated : r)) ?? null);
  const now = new Date();
  const shown = (reservations ?? [])
    .filter((r) => (tab === "upcoming" ? new Date(r.slotEnd) > now : new Date(r.slotEnd) <= now))
    .sort((a, b) => (tab === "upcoming" ? 1 : -1) * a.slotStart.localeCompare(b.slotStart));

  return (
    <>
      <PageTitle title="My bookings" />
      <div role="tablist" aria-label="Bookings" className="mb-4 flex gap-2">
        {(["upcoming", "past"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-11 rounded-[var(--radius-control)] px-4 font-semibold ${tab === t ? "bg-pine text-white" : "bg-white text-pine hover:underline"}`}
          >
            {t === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {error && <ErrorBanner message={`We couldn't load your bookings: ${error}`} />}
        {!error && !reservations && <p role="status" className="text-muted">Loading your bookings…</p>}
        {reservations && shown.length === 0 && (
          <div className="card p-6">
            <p>{tab === "upcoming" ? "No upcoming bookings yet." : "No past bookings yet."}</p>
            {tab === "upcoming" && <Link to="/" className="btn-primary mt-4">Reserve a table</Link>}
          </div>
        )}
        <ul className="grid gap-4">
          {shown.map((r) => (
            <li key={r.id} className="card space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{formatSlot(r.slotStart, r.slotEnd)}</p>
                <StatusBadge status={r.status} />
              </div>
              <PlaceCard code={r.code} size="sm" />
              <p className="text-sm text-muted">
                {BRANCH_LABEL[r.branch]}, {SECTOR_LABEL[r.sector]} · {r.partySize} {r.partySize === 1 ? "guest" : "guests"}
              </p>
              <p className="text-sm">{tableSummary(r.sector, r.tableIds)}</p>
              {canChange(r) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" className="btn-quiet" aria-label={`Change time for ${r.code}`} onClick={() => setRescheduling(r)}>
                    Change time
                  </button>
                  <button type="button" className="btn-danger" aria-label={`Release booking ${r.code}`} onClick={() => setCancelling(r)}>
                    Release booking
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {rescheduling && (
        <RescheduleDialog
          reservation={rescheduling}
          onClose={() => setRescheduling(null)}
          onSaved={(r) => {
            replace(r);
            setRescheduling(null);
          }}
        />
      )}
      {cancelling && (
        <CancelDialog
          reservation={cancelling}
          onClose={() => setCancelling(null)}
          onCancelled={(r) => {
            replace(r);
            setCancelling(null);
          }}
        />
      )}
    </>
  );
}
