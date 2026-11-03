import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 items-center justify-center px-1 text-sm font-semibold ${
    isActive ? "border-t-2 border-brass text-pine" : "border-t-2 border-transparent text-muted hover:text-pine"
  }`;

/** Phone-width shell: brand header, content column, bottom tab bar (thumb reach). */
export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const tabs =
    user?.role === "ADMIN"
      ? [
          { to: "/admin", label: "Today" },
          { to: "/admin/logs", label: "Booking log" },
        ]
      : user
        ? [
            { to: "/", label: "Reserve" },
            { to: "/bookings", label: "Bookings" },
            { to: "/menu", label: "Menu" },
            { to: "/profile", label: "Profile" },
          ]
        : [
            { to: "/menu", label: "Menu" },
            { to: "/login", label: "Sign in" },
          ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="font-serif text-2xl font-semibold text-pine">
          ResortOS <span className="text-brass">Dining</span>
        </p>
        {user?.role === "ADMIN" && (
          <button
            type="button"
            className="min-h-11 px-2 font-semibold text-muted hover:text-pine hover:underline"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        )}
      </header>
      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end className={tabClass}>
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
