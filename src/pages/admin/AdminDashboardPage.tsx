import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ErrorBanner, PageTitle } from "../../components/ui";
import { api } from "../../lib/api";
import { BRANCH_LABEL, SECTOR_LABEL, localDateKey } from "../../lib/format";
import type { Branch, Stats } from "../../types/api";

const UNIT = { MAIN_HALL: "table-sittings", VIP_WING: "room-sittings" } as const;

export function AdminDashboardPage() {
  const [date, setDate] = useState(localDateKey());
  const [branch, setBranch] = useState<Branch | "">("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setStats(null);
    setError(null);
    api<Stats>(`/admin/stats?date=${date}${branch ? `&branch=${branch}` : ""}`)
      .then((result) => current && setStats(result))
      .catch((err: Error) => current && setError(err.message));
    return () => {
      current = false;
    };
  }, [date, branch]);

  return (
    <>
      <PageTitle title="Today at a glance" lead="How full the rooms are for one day. Read-only: changes happen at the host stand." />
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="stats-date" className="field-label">Date</label>
          <input id="stats-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="stats-branch" className="field-label">Restaurant</label>
          <select id="stats-branch" className="input" value={branch} onChange={(e) => setBranch(e.target.value as Branch | "")}>
            <option value="">Both branches</option>
            <option value="BRANCH_1">{BRANCH_LABEL.BRANCH_1}</option>
            <option value="BRANCH_2">{BRANCH_LABEL.BRANCH_2}</option>
          </select>
        </div>
      </div>

      {error && <ErrorBanner message={`We couldn't load the numbers: ${error}`} />}
      {!error && !stats && <p role="status" className="text-muted">Counting bookings…</p>}
      {stats && (
        <div className="grid gap-4">
          <section className="card p-6" aria-labelledby="covers-heading">
            <h2 id="covers-heading" className="sr-only">Guests expected</h2>
            <p data-testid="stat-covers" className="text-6xl font-semibold tabular-nums text-pine">
              {stats.totalCovers} <span className="text-xl font-normal text-muted">guests expected</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
              <p data-testid="stat-bookings">
                <span className="text-2xl font-semibold">{stats.totalBookings}</span> active bookings
                {stats.agentBookings > 0 && <span className="block text-sm text-muted">of which {stats.agentBookings} via AI assistant</span>}
              </p>
              <p data-testid="stat-cancellations"><span className="text-2xl font-semibold">{stats.cancellations}</span> cancelled</p>
            </div>
            {stats.totalBookings === 0 && <p className="mt-4 text-muted">No bookings for this day yet.</p>}
          </section>
          <section className="card space-y-4 p-6" aria-labelledby="util-heading">
            <h2 id="util-heading" className="text-2xl">Room utilisation</h2>
            {stats.utilization.map((u) => (
              <div key={u.sector}>
                <p className="font-semibold">{SECTOR_LABEL[u.sector]}</p>
                <p className="text-sm text-muted">
                  {u.usedUnits} of {u.capacityUnits} {UNIT[u.sector]} ({Math.round(u.rate * 100)}%)
                </p>
                <div className="mt-1 h-2 rounded-full bg-sky" role="presentation">
                  <div className="h-2 rounded-full bg-pine" style={{ width: `${Math.min(100, u.rate * 100)}%` }} />
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
      <p className="mt-6">
        <Link to="/admin/logs" className="font-semibold text-pine underline">Open the booking log</Link> to look up a guest or reservation code.
      </p>
    </>
  );
}
