import { createContext, useContext, useState, ReactNode } from "react";
import type { User } from "../types";

/**
 * Shape of the authentication context value shared via React context.
 */
interface AuthContextType {
  /** Currently authenticated user, or null when logged out. */
  user: User | null;

  /** JWT token for API requests, or null when logged out. */
  token: string | null;

  /** Whether the current session is a temporary demo account. */
  isDemo: boolean;

  /** Persists credentials to localStorage and updates React state. */
  login: (token: string, user: User, demo?: boolean) => void;

  /** Clears all stored credentials and resets state. */
  logout: () => void;

  /** Updates the cached user profile in both state and localStorage. */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Context provider that manages authentication state (token, user, demo flag).
 * Persists credentials in localStorage and hydrates on mount.
 *
 * @param props.children - Child components that may consume auth context.
 */
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

  /**
   * Stores the JWT and user profile in localStorage and React state.
   * @param token - JWT returned from the auth endpoint.
   * @param user - Authenticated user profile.
   * @param demo - Whether this is a temporary demo session.
   */
  const login = (token: string, user: User, demo = false) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    if (demo) localStorage.setItem("isDemo", "true");
    else localStorage.removeItem("isDemo");
    setToken(token);
    setUser(user);
    setIsDemo(demo);
  };

  /** Clears all authentication data from localStorage and resets React state. */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isDemo");
    setToken(null);
    setUser(null);
    setIsDemo(false);
  };

  /**
   * Persists an updated user profile to localStorage and React state.
   * @param updated - The new user profile data.
   */
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

/**
 * Hook to access the current authentication context.
 * Must be called within an {@link AuthProvider}.
 *
 * @returns The authentication state and actions.
 * @throws Error if called outside of an AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
