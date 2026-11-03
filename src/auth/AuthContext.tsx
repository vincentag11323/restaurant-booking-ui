import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, json, refreshSession, setAccessToken, setSessionExpiredHandler } from "../backend-api/client";
import type { AuthResponse, User } from "../types/api";

interface AuthState {
  user: User | null;
  /** True until the refresh cookie has been tried on first load. */
  restoring: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  const signOutLocally = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(signOutLocally);
    refreshSession()
      .then((session) => setUser(session?.user ?? null))
      .finally(() => setRestoring(false));
  }, [signOutLocally]);

  const startSession = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      restoring,
      setUser,
      login: async (email, password) =>
        startSession(await api<AuthResponse>("/auth/login", { method: "POST", body: json({ email, password }) })),
      register: async (input) =>
        startSession(await api<AuthResponse>("/auth/register", { method: "POST", body: json(input) })),
      logout: async () => {
        await api("/auth/logout", { method: "POST" }).catch(() => undefined);
        signOutLocally();
      },
    }),
    [user, restoring, startSession, signOutLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
