import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 font-semibold ${
    isActive ? "bg-white text-pine" : "text-ink hover:text-pine hover:underline"
  }`;

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    user?.role === "ADMIN"
      ? [
          { to: "/admin", label: "Today" },
          { to: "/admin/logs", label: "Booking log" },
        ]
      : user
        ? [
            { to: "/", label: "Reserve" },
            { to: "/bookings", label: "My bookings" },
            { to: "/menu", label: "Menu" },
            { to: "/profile", label: "Profile" },
          ]
        : [
            { to: "/menu", label: "Menu" },
            { to: "/login", label: "Sign in" },
          ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-sky">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <p className="font-serif text-2xl font-semibold text-pine">
            ResortOS <span className="text-brass">Dining</span>
          </p>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end className={linkClass}>
                {link.label}
              </NavLink>
            ))}
            {user && (
              <button
                type="button"
                className="inline-flex min-h-11 items-center px-3 font-semibold text-muted hover:text-pine hover:underline"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-line px-4 py-4 text-center text-sm text-muted">
        ResortOS Dining · Branch 1 and Branch 2 · Tables are held in 2.5-hour sittings
      </footer>
    </div>
  );
}
