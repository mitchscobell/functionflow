import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { LogOut, User, Sun, Moon, Palette, ListTodo } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const cycleTheme = () => {
    const themes: Array<"function" | "dark" | "light"> = [
      "function",
      "dark",
      "light",
    ];
    const idx = themes.indexOf(theme);
    setTheme(themes[(idx + 1) % themes.length]);
  };

  const themeIcon =
    theme === "dark" ? (
      <Moon size={18} />
    ) : theme === "light" ? (
      <Sun size={18} />
    ) : (
      <Palette size={18} />
    );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-200">
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
              <button
                onClick={cycleTheme}
                className="rounded-lg p-2 hover:bg-[var(--hover)] transition-colors"
                title={`Theme: ${theme}`}
              >
                {themeIcon}
              </button>
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
