import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

/** Available UI color themes. */
type Theme = "function" | "dark" | "light" | "vaporwave" | "cyberpunk";

/**
 * Shape of the theme context value shared via React context.
 */
interface ThemeContextType {
  /** The currently active theme. */
  theme: Theme;

  /** Updates the active theme, persisting the choice to localStorage. */
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/** Maps each theme to its corresponding CSS class applied to the document root. */
const themeClasses: Record<Theme, string> = {
  function: "theme-function",
  dark: "theme-dark",
  light: "theme-light",
  vaporwave: "theme-vaporwave",
  cyberpunk: "theme-cyberpunk",
};

/** Set of themes that use a dark background and require Tailwind's dark mode class. */
const darkThemes: ReadonlySet<Theme> = new Set([
  "dark",
  "vaporwave",
  "cyberpunk",
]);

/**
 * Context provider that manages the active UI theme.
 * Persists the user's choice in localStorage and applies the corresponding
 * CSS class to the document root element. Also toggles Tailwind's dark mode.
 *
 * @param props.children - Child components that may consume theme context.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "function";
  });

  /**
   * Updates the active theme, persists to localStorage, and triggers a re-render.
   * @param t - The new theme to apply.
   */
  const setTheme = (t: Theme) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    Object.values(themeClasses).forEach((cls) => root.classList.remove(cls));
    // Add current
    root.classList.add(themeClasses[theme]);

    // Set dark mode for Tailwind
    if (darkThemes.has(theme)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme context.
 * Must be called within a {@link ThemeProvider}.
 *
 * @returns The current theme and a setter function.
 * @throws Error if called outside of a ThemeProvider.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
