import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../useTheme";

function TestConsumer() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>setDark</button>
      <button onClick={() => setTheme("light")}>setLight</button>
      <button onClick={() => setTheme("vaporwave")}>setVaporwave</button>
      <button onClick={() => setTheme("function")}>setFunction</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  const root = document.documentElement;
  root.className = "";
});

describe("ThemeProvider", () => {
  it("defaults to function theme", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("function");
    expect(document.documentElement.classList.contains("theme-function")).toBe(
      true,
    );
  });

  it("restores theme from localStorage", () => {
    localStorage.setItem("theme", "cyberpunk");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("cyberpunk");
    expect(document.documentElement.classList.contains("theme-cyberpunk")).toBe(
      true,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("setTheme updates state, localStorage, and DOM classes", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => screen.getByText("setDark").click());

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(
      true,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes previous theme class on switch", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => screen.getByText("setDark").click());
    expect(document.documentElement.classList.contains("theme-dark")).toBe(
      true,
    );

    act(() => screen.getByText("setLight").click());
    expect(document.documentElement.classList.contains("theme-dark")).toBe(
      false,
    );
    expect(document.documentElement.classList.contains("theme-light")).toBe(
      true,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("adds dark class for dark themes (vaporwave, cyberpunk, dark)", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => screen.getByText("setVaporwave").click());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class for light themes", () => {
    localStorage.setItem("theme", "dark");

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    act(() => screen.getByText("setFunction").click());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("useTheme outside provider", () => {
  it("throws when used outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useTheme must be used within ThemeProvider",
    );
    spy.mockRestore();
  });
});
