import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ErrorBanner, PageTitle } from "../components/ui";
import { api, json } from "../backend-api/client";
import { BRANCH_LABEL, SECTOR_LABEL, addDays, formatSlot, localDateKey } from "../lib/format";
import type { Branch, Reservation, Sector, Slot, SlotStartTime } from "../types/api";

const MAX_PARTY = 50;
const MAX_DAYS_AHEAD = 60;
const SEATS_PER_UNIT: Record<Sector, number> = { MAIN_HALL: 2, VIP_WING: 13 };

export function unitsFor(sector: Sector, partySize: number) {
  return Math.ceil(partySize / SEATS_PER_UNIT[sector]);
}

function ChoiceGroup<T extends string>({ legend, name, value, options, onChange }: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-11 items-start gap-3 rounded-[var(--radius-control)] border bg-white p-3 ${
              value === option.value ? "border-pine" : "border-line hover:border-pine"
            }`}
          >
            <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} className="mt-1 accent-pine" />
            <span>
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-sm text-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BookPage() {
  const navigate = useNavigate();
  const today = localDateKey();
  const [branch, setBranch] = useState<Branch>("BRANCH_1");
  const [sector, setSector] = useState<Sector>("MAIN_HALL");
  const [date, setDate] = useState(addDays(today, 1));
  const [startTime, setStartTime] = useState<SlotStartTime | null>(null);
  const [partySize, setPartySize] = useState("2");
  const [specialRequests, setSpecialRequests] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!date) return;
    let current = true;
    setSlots(null);
    setSlotsError(null);
    setStartTime(null);
    api<Slot[]>(`/availability?branch=${branch}&sector=${sector}&date=${date}`)
      .then((data) => current && setSlots(data))
      .catch((err: Error) => current && setSlotsError(err.message));
    return () => {
      current = false;
    };
  }, [branch, sector, date]);

  const party = Number(partySize);
  const partyValid = Number.isInteger(party) && party >= 1 && party <= MAX_PARTY;
  const unitWord = sector === "MAIN_HALL" ? "tables" : "rooms";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!partyValid) return setFormError(`Party size must be between 1 and ${MAX_PARTY}`);
    if (!startTime) return setFormError("Choose a sitting time");
    setBusy(true);
    setFormError(null);
    try {
      const reservation = await api<Reservation>("/reservations", {
        method: "POST",
        body: json({ branch, sector, date, startTime, partySize: party, ...(specialRequests.trim() && { specialRequests: specialRequests.trim() }) }),
      });
      navigate(`/bookings/${reservation.id}/confirmed`, { state: reservation });
    } catch (err) {
      setFormError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Reserve a table" lead="Every sitting is 2.5 hours. Pick a room and a time, and we will join tables for your party." />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="card space-y-6 p-5">
          <ChoiceGroup
            legend="Restaurant"
            name="branch"
            value={branch}
            onChange={setBranch}
            options={[
              { value: "BRANCH_1", label: BRANCH_LABEL.BRANCH_1, hint: "Main resort" },
              { value: "BRANCH_2", label: BRANCH_LABEL.BRANCH_2, hint: "Second location" },
            ]}
          />
          <ChoiceGroup
            legend="Room"
            name="sector"
            value={sector}
            onChange={setSector}
            options={[
              { value: "MAIN_HALL", label: SECTOR_LABEL.MAIN_HALL, hint: "Two-seat tables joined for your group" },
              { value: "VIP_WING", label: SECTOR_LABEL.VIP_WING, hint: "Private rooms of 13, merged for larger parties" },
            ]}
          />
          <div className="grid gap-4">
            <div>
              <label htmlFor="date" className="field-label">Date</label>
              <input id="date" type="date" className="input" value={date} min={today} max={addDays(today, MAX_DAYS_AHEAD)} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label htmlFor="partySize" className="field-label">Guests</label>
              <input id="partySize" type="number" inputMode="numeric" min={1} max={MAX_PARTY} className="input" value={partySize} onChange={(e) => setPartySize(e.target.value)} aria-describedby="party-hint" />
              <p id="party-hint" className="mt-1 text-sm text-muted">1 to {MAX_PARTY} guests</p>
            </div>
          </div>
          <fieldset>
            <legend className="field-label">Sitting</legend>
            {slotsError && <ErrorBanner message={`We couldn't load sittings: ${slotsError}`} />}
            {!slotsError && !slots && <p className="text-muted" role="status">Checking which tables are free…</p>}
            {slots && (
              <div className="grid gap-2">
                {slots.map((slot) => {
                  const fits = !partyValid || slot.freeUnits >= unitsFor(sector, party);
                  const disabled = !slot.bookable || slot.freeUnits === 0 || !fits;
                  const note = !slot.bookable
                    ? "Not open for booking"
                    : slot.freeUnits === 0
                      ? "Fully booked"
                      : !fits
                        ? `Not enough room for ${party}`
                        : `${slot.freeUnits} ${unitWord} free`;
                  return (
                    <label
                      key={slot.startTime}
                      className={`flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] border bg-white p-3 ${
                        disabled ? "border-line opacity-60" : startTime === slot.startTime ? "border-pine" : "border-line hover:border-pine"
                      }`}
                    >
                      <input type="radio" name="slot" value={slot.startTime} disabled={disabled} checked={startTime === slot.startTime} onChange={() => setStartTime(slot.startTime)} className="accent-pine" />
                      <span>
                        <span className="block font-semibold">{formatSlot(slot.slotStart, slot.slotEnd).split(", ")[1]}</span>
                        <span className="block text-sm text-muted">{note}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
          <div>
            <label htmlFor="specialRequests" className="field-label">Special requests or dietary notes</label>
            <textarea id="specialRequests" className="input min-h-24" maxLength={500} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} placeholder="Allergies, high chair, celebration…" />
          </div>
        </div>
        <section aria-labelledby="summary-heading" className="card space-y-4 p-5">
          <h2 id="summary-heading" className="text-2xl">Your sitting</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted">Restaurant</dt><dd>{BRANCH_LABEL[branch]}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Room</dt><dd>{SECTOR_LABEL[sector]}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Time</dt><dd>{startTime ?? "Not chosen"}</dd></div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">{sector === "MAIN_HALL" ? "Tables" : "Rooms"}</dt>
              <dd>{partyValid ? unitsFor(sector, party) : "–"}</dd>
            </div>
          </dl>
          <ErrorBanner message={formError} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Holding your table…" : "Hold this table"}
          </button>
        </section>
      </form>
    </>
  );
}
