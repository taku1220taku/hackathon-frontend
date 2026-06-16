import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { User } from "./types";

type AuthContextValue = {
  token: string;
  user: User | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem("capcycle_token") ?? "");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setUser(null);
      return () => {
        cancelled = true;
      };
    }
    api<User>("/me", { token })
      .then((nextUser) => {
        if (!cancelled) setUser(nextUser);
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem("capcycle_token");
        setToken("");
        setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    setSession(nextToken, nextUser) {
      localStorage.setItem("capcycle_token", nextToken);
      setToken(nextToken);
      setUser(nextUser);
    },
    logout() {
      localStorage.removeItem("capcycle_token");
      setToken("");
      setUser(null);
    },
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
