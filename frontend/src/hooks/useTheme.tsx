import { createContext, useContext, useState, useEffect, ReactNode } from "react";

/** Available UI color themes. */
type Theme = "function" | "dark" | "light" | "vaporwave" | "cyberpunk" | "custom";

/**
 * Shape of the theme context value shared via React context.
 */
interface ThemeContextType {
  /** The currently active theme. */
  theme: Theme;

  /** Updates the active theme, persisting the choice to localStorage. */
  setTheme: (t: Theme) => void;

  /** Custom theme color overrides (only used when theme === "custom"). */
  customColors: Record<string, string>;

  /** Updates the custom color palette and persists to localStorage. */
  setCustomColors: (colors: Record<string, string>) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/** Maps each theme to its corresponding CSS class applied to the document root. */
const themeClasses: Record<Theme, string> = {
  function: "theme-function",
  dark: "theme-dark",
  light: "theme-light",
  vaporwave: "theme-vaporwave",
  cyberpunk: "theme-cyberpunk",
  custom: "theme-custom",
};

/** Set of themes that use a dark background and require Tailwind's dark mode class. */
const darkThemes: ReadonlySet<Theme> = new Set(["dark", "vaporwave", "cyberpunk"]);

/** Default colors used by the custom theme. */
const DEFAULT_CUSTOM_COLORS: Record<string, string> = {
  "--bg": "#fafafa",
  "--bg-secondary": "#f4f4f5",
  "--text": "#18181b",
  "--text-secondary": "#52525b",
  "--accent": "#2563eb",
  "--accent-hover": "#1d4ed8",
  "--card": "#ffffff",
  "--border": "#e4e4e7",
  "--hover": "#f4f4f5",
  "--muted": "#71717a",
  "--success": "#16a34a",
  "--input-bg": "#ffffff",
};

/** Determines if a set of custom colors uses a dark background. */
function isCustomDark(colors: Record<string, string>): boolean {
  const bg = colors["--bg"] || "#fafafa";
  // Parse hex and check luminance — dark if average RGB < 128
  const hex = bg.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r + g + b) / 3 < 128;
}

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

  const [customColors, setCustomColorsState] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem("customThemeColors");
      return stored ? JSON.parse(stored) : DEFAULT_CUSTOM_COLORS;
    } catch {
      return DEFAULT_CUSTOM_COLORS;
    }
  });

  /**
   * Updates the active theme, persists to localStorage, and triggers a re-render.
   * @param t - The new theme to apply.
   */
  const setTheme = (t: Theme) => {
    localStorage.setItem("theme", t);
    setThemeState(t);
  };

  const setCustomColors = (colors: Record<string, string>) => {
    localStorage.setItem("customThemeColors", JSON.stringify(colors));
    setCustomColorsState(colors);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme classes
    Object.values(themeClasses).forEach((cls) => root.classList.remove(cls));
    // Add current
    root.classList.add(themeClasses[theme]);

    // Apply/remove custom CSS variables
    if (theme === "custom") {
      Object.entries(customColors).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      if (isCustomDark(customColors)) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    } else {
      // Clean up any inline custom vars
      Object.keys(DEFAULT_CUSTOM_COLORS).forEach((key) => {
        root.style.removeProperty(key);
      });
      if (darkThemes.has(theme)) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme, customColors]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors }}>
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
