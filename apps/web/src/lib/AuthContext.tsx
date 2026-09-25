import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";

export interface ParentSession {
  kind: "parent";
  user: { id: string; email: string; displayName: string };
  householdId: string;
  role: "PARENT_ADMIN" | "PARENT";
}

export interface ChildSession {
  kind: "child";
  child: { id: string; displayName: string; avatarId: string; ageBand: "AGE_8_9" | "AGE_10_12" };
  householdId: string;
}

export type Session = ParentSession | ChildSession;

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const LAST_HOUSEHOLD_KEY = "okodukai:lastHouseholdId";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<Session>("/auth/me");
      setSession(me);
      if (me?.householdId) {
        localStorage.setItem(LAST_HOUSEHOLD_KEY, me.householdId);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ session, loading, refresh, setSession }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
