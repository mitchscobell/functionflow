import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Theme = "function" | "dark" | "light" | "vaporwave" | "cyberpunk";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const themeClasses: Record<Theme, string> = {
  function: "theme-function",
  dark: "theme-dark",
  light: "theme-light",
  vaporwave: "theme-vaporwave",
  cyberpunk: "theme-cyberpunk",
};

const darkThemes: ReadonlySet<Theme> = new Set([
  "dark",
  "vaporwave",
  "cyberpunk",
]);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "function";
  });

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

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
