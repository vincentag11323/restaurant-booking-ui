import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { homeFor } from "../App";
import { useAuth } from "../auth/AuthContext";
import { ErrorBanner, PageTitle } from "../components/ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const user = await login(String(form.get("email")), String(form.get("password")));
      navigate(homeFor(user.role), { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle title="Welcome back" lead="Sign in to reserve a table or manage your bookings." />
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <ErrorBanner message={error} />
        <div>
          <label htmlFor="email" className="field-label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="email@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="field-label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-center text-muted">
          New here? <Link to="/register" className="font-semibold text-pine underline">Create a guest account</Link>
        </p>
      </form>
    </div>
  );
}
