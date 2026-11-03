import { type FormEvent, useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ErrorBanner, PageTitle, PlaceCard, StatusBadge } from "../../components/ui";
import { api, request } from "../../backend-api/client";
import { BRANCH_LABEL, SECTOR_LABEL, formatSlot, formatStamp, tableSummary } from "../../lib/format";
import type { AdminReservation, AdminReservationPage } from "../../types/api";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["branch", "sector", "status", "source", "from", "to", "q"] as const;

function toQuery(form: FormData): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = String(form.get(key) ?? "").trim();
    if (value) params.set(key, value);
  }
  return params;
}

async function download(params: URLSearchParams, format: "csv" | "json") {
  const res = await request(`/admin/reservations/export?${params}&format=${format}`);
  const filename = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `reservations.${format}`;
  const url = URL.createObjectURL(await res.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

function Detail({ row, onClose }: { row: AdminReservation; onClose: () => void }) {
  const fields: [string, string][] = [
    ["Guest", row.customer.name],
    ["Email", row.customer.email],
    ["Phone", row.customer.phone ?? "Not given"],
    ["Sitting", formatSlot(row.slotStart, row.slotEnd)],
    ["Where", `${BRANCH_LABEL[row.branch]}, ${SECTOR_LABEL[row.sector]}`],
    ["Guests", String(row.partySize)],
    ["Seating", tableSummary(row.sector, row.tableIds)],
    ["Booked at", formatStamp(row.createdAt)],
    ...(row.cancelledAt ? [["Cancelled at", formatStamp(row.cancelledAt)] as [string, string]] : []),
    ["Notes", row.specialRequests ?? "None"],
    ["Booked by", row.source === "AGENT" ? `AI assistant, on behalf of ${row.customer.email}` : "Guest, in the app"],
  ];
  return (
    <Dialog title={row.code} open onClose={onClose}>
      <StatusBadge status={row.status} />
      <PlaceCard code={row.code} size="sm" />
      <dl className="space-y-3">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <button type="button" className="btn-quiet w-full" onClick={onClose}>Close</button>
    </Dialog>
  );
}

export function AdminLogsPage() {
  const [params, setParams] = useState(new URLSearchParams());
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminReservationPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminReservation | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    // Ignore responses from superseded filters so a slow old query can't overwrite newer results.
    let current = true;
    setData(null);
    setError(null);
    api<AdminReservationPage>(`/admin/reservations?${params}&page=${page}&pageSize=${PAGE_SIZE}`)
      .then((result) => current && setData(result))
      .catch((err: Error) => current && setError(err.message));
    return () => {
      current = false;
    };
  }, [params, page]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams(toQuery(new FormData(event.currentTarget)));
    setPage(1);
  }

  async function onExport(format: "csv" | "json") {
    setExportError(null);
    await download(params, format).catch((err: Error) => setExportError(err.message));
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageTitle title="Booking log" lead="Every reservation across both branches. Read-only." />
      <form onSubmit={onSubmit} className="card mb-4 grid grid-cols-2 gap-3 p-4">
        <div className="col-span-2">
          <label htmlFor="q" className="field-label">Search</label>
          <input id="q" name="q" className="input" placeholder="Name, email, phone or RSV code" />
        </div>
        <div>
          <label htmlFor="branch" className="field-label">Restaurant</label>
          <select id="branch" name="branch" className="input">
            <option value="">All</option>
            <option value="BRANCH_1">{BRANCH_LABEL.BRANCH_1}</option>
            <option value="BRANCH_2">{BRANCH_LABEL.BRANCH_2}</option>
          </select>
        </div>
        <div>
          <label htmlFor="sector" className="field-label">Room</label>
          <select id="sector" name="sector" className="input">
            <option value="">All</option>
            <option value="MAIN_HALL">{SECTOR_LABEL.MAIN_HALL}</option>
            <option value="VIP_WING">{SECTOR_LABEL.VIP_WING}</option>
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="status" className="field-label">Status</label>
          <select id="status" name="status" className="input">
            <option value="">All</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="SEATED">Seated</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No-show</option>
          </select>
        </div>
        <div className="col-span-2">
          <label htmlFor="source" className="field-label">Booked by</label>
          <select id="source" name="source" className="input">
            <option value="">Anyone</option>
            <option value="APP">Guest, in the app</option>
            <option value="AGENT">AI assistant</option>
          </select>
        </div>
        <div>
          <label htmlFor="from" className="field-label">From</label>
          <input id="from" name="from" type="date" className="input" />
        </div>
        <div>
          <label htmlFor="to" className="field-label">To</label>
          <input id="to" name="to" type="date" className="input" />
        </div>
        <div className="col-span-2 flex flex-wrap gap-2">
          <button type="submit" className="btn-primary w-full">Apply filters</button>
          <button type="button" className="btn-quiet flex-1" onClick={() => onExport("csv")}>Export CSV</button>
          <button type="button" className="btn-quiet flex-1" onClick={() => onExport("json")}>Export JSON</button>
        </div>
      </form>
      <ErrorBanner message={exportError} />

      {error && <ErrorBanner message={`We couldn't load bookings: ${error}`} />}
      {!error && !data && <p role="status" className="text-muted">Loading bookings…</p>}
      {data && data.items.length === 0 && <p className="card p-6">No bookings match these filters.</p>}
      {data && data.items.length > 0 && (
        <ul className="space-y-3" aria-label="Reservations, newest sitting first">
          {data.items.map((row) => (
            <li key={row.id} className="card space-y-1 p-4">
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="min-h-11 font-semibold text-pine underline hover:text-ink" aria-label={`View ${row.code}`} onClick={() => setSelected(row)}>
                  {row.code}
                </button>
                <StatusBadge status={row.status} />
              </div>
              <p className="font-semibold">{row.customer.name}</p>
              {row.source === "AGENT" && <p className="text-sm font-semibold text-pine">Booked by AI assistant</p>}
              <p className="text-sm">{formatSlot(row.slotStart, row.slotEnd)}</p>
              <p className="text-sm text-muted">
                {BRANCH_LABEL[row.branch]}, {SECTOR_LABEL[row.sector]} · {row.partySize} {row.partySize === 1 ? "guest" : "guests"}
              </p>
            </li>
          ))}
        </ul>
      )}
      {data && data.total > data.pageSize && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-2">
          <button type="button" className="btn-quiet" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <p className="text-muted">Page {page} of {pages} · {data.total} bookings</p>
          <button type="button" className="btn-quiet" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      )}
      {selected && <Detail row={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
