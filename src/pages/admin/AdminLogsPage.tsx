import { type FormEvent, useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ErrorBanner, PageTitle, PlaceCard, StatusBadge } from "../../components/ui";
import { api, request } from "../../lib/api";
import { BRANCH_LABEL, SECTOR_LABEL, formatSlot, formatStamp, tableSummary } from "../../lib/format";
import type { AdminReservation, AdminReservationPage } from "../../types/api";

const PAGE_SIZE = 20;
const FILTER_KEYS = ["branch", "sector", "status", "from", "to", "q"] as const;

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
  ];
  return (
    <Dialog title={row.code} open onClose={onClose} placement="drawer">
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
      <form onSubmit={onSubmit} className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
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
        <div className="lg:col-span-2">
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
        <div>
          <label htmlFor="from" className="field-label">From</label>
          <input id="from" name="from" type="date" className="input" />
        </div>
        <div>
          <label htmlFor="to" className="field-label">To</label>
          <input id="to" name="to" type="date" className="input" />
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
          <button type="submit" className="btn-primary">Apply filters</button>
          <button type="button" className="btn-quiet" onClick={() => onExport("csv")}>Export CSV</button>
          <button type="button" className="btn-quiet" onClick={() => onExport("json")}>Export JSON</button>
        </div>
      </form>
      <ErrorBanner message={exportError} />

      {error && <ErrorBanner message={`We couldn't load bookings: ${error}`} />}
      {!error && !data && <p role="status" className="text-muted">Loading bookings…</p>}
      {data && data.items.length === 0 && <p className="card p-6">No bookings match these filters.</p>}
      {data && data.items.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left">
            <caption className="sr-only">Reservations, newest sitting first</caption>
            <thead className="border-b border-line text-sm text-muted">
              <tr>
                <th scope="col" className="p-3">Code</th>
                <th scope="col" className="p-3">Guest</th>
                <th scope="col" className="p-3">Sitting</th>
                <th scope="col" className="p-3">Room</th>
                <th scope="col" className="p-3">Party</th>
                <th scope="col" className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="p-3">
                    {/* The code opens the detail drawer: first column, so it stays on screen on phones. */}
                    <button type="button" className="min-h-11 font-semibold text-pine underline hover:text-ink" aria-label={`View ${row.code}`} onClick={() => setSelected(row)}>
                      {row.code}
                    </button>
                  </td>
                  <td className="p-3">{row.customer.name}</td>
                  <td className="p-3">{formatSlot(row.slotStart, row.slotEnd)}</td>
                  <td className="p-3">{BRANCH_LABEL[row.branch]}, {SECTOR_LABEL[row.sector]}</td>
                  <td className="p-3">{row.partySize}</td>
                  <td className="p-3"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
