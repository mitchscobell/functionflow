import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { api } from "../lib/api";
import {
  LogOut,
  User,
  Sun,
  Moon,
  Palette,
  Sunset,
  Zap,
  ListTodo,
  AlertTriangle,
  CalendarDays,
  Check,
} from "lucide-react";
import ConvertAccountWizard from "./ConvertAccountWizard";

/**
 * Application shell that wraps page content with a top navigation bar,
 * theme picker, demo-account banner, and the convert-account wizard overlay.
 *
 * @param props.children - Page content rendered inside the main area.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isDemo, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [themeOpen, setThemeOpen] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node))
        setThemeOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /** Available theme options with their display labels and icons. */
  const themes = [
    {
      key: "function" as const,
      label: "Function",
      icon: <Palette size={16} />,
    },
    { key: "dark" as const, label: "Dark", icon: <Moon size={16} /> },
    { key: "light" as const, label: "Light", icon: <Sun size={16} /> },
    {
      key: "vaporwave" as const,
      label: "Vaporwave",
      icon: <Sunset size={16} />,
    },
    { key: "cyberpunk" as const, label: "Cyberpunk", icon: <Zap size={16} /> },
  ];

  const currentTheme = themes.find((t) => t.key === theme) ?? themes[0];

  /**
   * Handles user logout. For demo accounts, calls the server-side demo
   * cleanup endpoint first before clearing local state.
   */
  const handleLogout = async () => {
    if (isDemo) {
      try {
        await api.demoLogout();
      } catch {
        // ignore — session may already be gone
      }
    }
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-1.5 text-center text-xs text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
          <AlertTriangle size={14} />
          Demo mode — data will be deleted on logout.
          <button
            onClick={() => setShowConvert(true)}
            className="ml-1 underline font-medium hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
          >
            Keep your account
          </button>
        </div>
      )}
      {showConvert && (
        <ConvertAccountWizard onClose={() => setShowConvert(false)} />
      )}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg)]/80">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg text-[var(--accent)]"
          >
            <ListTodo size={22} />
            FunctionFlow
          </Link>

          {user && (
            <nav className="flex items-center gap-1">
              <div className="relative" ref={themeRef}>
                <button
                  onClick={() => setThemeOpen(!themeOpen)}
                  className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors"
                  title={`Theme: ${theme}`}
                >
                  {currentTheme.icon}
                </button>
                {themeOpen && (
                  <div className="absolute right-0 mt-1 w-44 rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-lg py-1 z-50">
                    {themes.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => {
                          setTheme(t.key);
                          setThemeOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--hover)] transition-colors"
                      >
                        {t.icon}
                        <span className="flex-1 text-left">{t.label}</span>
                        {theme === t.key && (
                          <Check size={14} className="text-[var(--accent)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link
                to="/calendar"
                className={`rounded-lg p-2 hover:bg-[var(--hover)] transition-colors ${
                  location.pathname === "/calendar" ? "bg-[var(--hover)]" : ""
                }`}
                title="Calendar"
              >
                <CalendarDays size={18} />
              </Link>
              <Link
                to="/profile"
                className={`rounded-lg p-2 hover:bg-[var(--hover)] transition-colors ${
                  location.pathname === "/profile" ? "bg-[var(--hover)]" : ""
                }`}
              >
                <User size={18} />
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors text-red-500"
              >
                <LogOut size={18} />
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
