import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../backendApi/auth";
import { setSessionExpiredHandler } from "../backendApi/client";
import { getMe } from "../backendApi/users";
import type { AuthResponse, RegisterInput, User } from "../types/api";

interface AuthState {
  user: User | null;
  /** True until the page-load session check (GET /me) has answered. */
  restoring: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);

  const signOutLocally = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(signOutLocally);
    // The session is an HttpOnly cookie the app can't read, so ask the API who is signed in.
    getMe()
      .then(setUser, () => setUser(null))
      .finally(() => setRestoring(false));
  }, [signOutLocally]);

  const startSession = useCallback((session: AuthResponse) => {
    setUser(session.user);
    return session.user;
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      restoring,
      setUser,
      login: async (email, password) =>
        startSession(await authApi.login(email, password)),
      register: async (input) =>
        startSession(await authApi.register(input)),
      logout: async () => {
        await authApi.logout().catch(() => undefined);
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
