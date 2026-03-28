import { createContext, useContext, useState, ReactNode } from "react";
import type { User } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isDemo: boolean;
  login: (token: string, user: User, demo?: boolean) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [isDemo, setIsDemo] = useState(
    () => localStorage.getItem("isDemo") === "true",
  );

  const login = (token: string, user: User, demo = false) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    if (demo) localStorage.setItem("isDemo", "true");
    else localStorage.removeItem("isDemo");
    setToken(token);
    setUser(user);
    setIsDemo(demo);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isDemo");
    setToken(null);
    setUser(null);
    setIsDemo(false);
  };

  const updateUser = (updated: User) => {
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isDemo, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
