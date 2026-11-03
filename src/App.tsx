import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import type { Role } from "./types/api";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminLogsPage } from "./pages/admin/AdminLogsPage";
import { BookPage } from "./pages/BookPage";
import { ConfirmationPage } from "./pages/ConfirmationPage";
import { LoginPage } from "./pages/LoginPage";
import { MenuPage } from "./pages/MenuPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";

export const homeFor = (role: Role) => (role === "ADMIN" ? "/admin" : "/");

/** Sends guests to /login and the wrong role to its own home. */
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, restoring } = useAuth();
  if (restoring) return <p className="p-6 text-muted">Restoring your session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, restoring } = useAuth();
  if (restoring) return null;
  return user ? <Navigate to={homeFor(user.role)} replace /> : children;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/" element={<RequireRole role="USER"><BookPage /></RequireRole>} />
        <Route path="/bookings" element={<RequireRole role="USER"><MyBookingsPage /></RequireRole>} />
        <Route path="/bookings/:id/confirmed" element={<RequireRole role="USER"><ConfirmationPage /></RequireRole>} />
        <Route path="/profile" element={<RequireRole role="USER"><ProfilePage /></RequireRole>} />
        <Route path="/admin" element={<RequireRole role="ADMIN"><AdminDashboardPage /></RequireRole>} />
        <Route path="/admin/logs" element={<RequireRole role="ADMIN"><AdminLogsPage /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
