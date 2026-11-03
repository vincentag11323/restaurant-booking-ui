import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner, PageTitle } from "../components/ui";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setPasswordError("Password must be at least 8 characters");
    setPasswordError(null);
    setError(null);
    setBusy(true);
    try {
      const phone = String(form.get("phone")).trim();
      await register({ name: String(form.get("name")).trim(), email: String(form.get("email")).trim(), password, ...(phone && { phone }) });
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle title="Create a guest account" lead="Book tables, change times and keep your allergy notes in one place." />
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <ErrorBanner message={error} />
        <div>
          <label htmlFor="name" className="field-label">Full name</label>
          <input id="name" name="name" autoComplete="name" required maxLength={100} className="input" placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="email@example.com" />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className="input" placeholder="+62 …" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required className="input" aria-describedby="password-hint" aria-invalid={Boolean(passwordError)} />
          <p id="password-hint" className={`mt-1 text-sm ${passwordError ? "text-danger" : "text-muted"}`}>
            {passwordError ?? "At least 8 characters"}
          </p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="text-center text-muted">
          Already a guest? <Link to="/login" className="font-semibold text-pine underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
