import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner, PageTitle } from "../components/ui";
import { updateMe } from "../backendApi/users";

export function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const allergies = String(form.get("allergies")).split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
    const phone = String(form.get("phone")).trim();
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      setUser(await updateMe({ name: String(form.get("name")).trim(), phone: phone || null, allergies }));
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle title="Profile" lead="Your allergies shape the dishes we suggest and are shared with the kitchen for your bookings." />
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <ErrorBanner message={error} />
        <p className="text-muted">Signed in as <span className="font-semibold text-ink">{user.email}</span></p>
        <div>
          <label htmlFor="name" className="field-label">Full name</label>
          <input id="name" name="name" required maxLength={100} defaultValue={user.name} className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">Phone</label>
          <input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" placeholder="+62 …" />
        </div>
        <div>
          <label htmlFor="allergies" className="field-label">Allergies</label>
          <input id="allergies" name="allergies" defaultValue={user.allergies.join(", ")} className="input" placeholder="e.g. shellfish, nuts" aria-describedby="allergies-hint" />
          <p id="allergies-hint" className="mt-1 text-sm text-muted">Separate with commas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
          <p role="status" className="text-pine">{saved ? "Profile saved" : ""}</p>
        </div>
      </form>
      <button
        type="button"
        className="btn-quiet mt-4 w-full"
        onClick={async () => {
          await logout();
          navigate("/login");
        }}
      >
        Sign out
      </button>
    </div>
  );
}
