import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../hooks/useAuth";
import { ThemeProvider } from "../hooks/useTheme";

// Mock all page components
vi.mock("../pages/LoginPage", () => ({
  default: () => <div data-testid="login-page">LoginPage</div>,
}));
vi.mock("../pages/DashboardPage", () => ({
  default: () => <div data-testid="dashboard-page">DashboardPage</div>,
}));
vi.mock("../pages/ProfilePage", () => ({
  default: () => <div data-testid="profile-page">ProfilePage</div>,
}));
vi.mock("../pages/CalendarPage", () => ({
  default: () => <div data-testid="calendar-page">CalendarPage</div>,
}));
vi.mock("../pages/VersionPage", () => ({
  default: () => <div data-testid="version-page">VersionPage</div>,
}));

function renderApp(route: string, opts: { authenticated?: boolean } = {}) {
  const { authenticated = false } = opts;

  if (authenticated) {
    localStorage.setItem("token", "jwt");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: 1,
        email: "a@b.com",
        displayName: "A",
        themePreference: "",
      }),
    );
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
});

describe("App routing", () => {
  it("redirects unauthenticated user from / to /login", () => {
    renderApp("/");
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("redirects unauthenticated user from /profile to /login", () => {
    renderApp("/profile");
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("redirects unauthenticated user from /calendar to /login", () => {
    renderApp("/calendar");
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("shows DashboardPage for authenticated user at /", () => {
    renderApp("/", { authenticated: true });
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("shows ProfilePage for authenticated user at /profile", () => {
    renderApp("/profile", { authenticated: true });
    expect(screen.getByTestId("profile-page")).toBeInTheDocument();
  });

  it("shows CalendarPage for authenticated user at /calendar", () => {
    renderApp("/calendar", { authenticated: true });
    expect(screen.getByTestId("calendar-page")).toBeInTheDocument();
  });

  it("redirects authenticated user from /login to /", () => {
    renderApp("/login", { authenticated: true });
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("shows LoginPage for unauthenticated user at /login", () => {
    renderApp("/login");
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });

  it("shows VersionPage at /version without auth", () => {
    renderApp("/version");
    expect(screen.getByTestId("version-page")).toBeInTheDocument();
  });

  it("shows VersionPage at /version with auth", () => {
    renderApp("/version", { authenticated: true });
    expect(screen.getByTestId("version-page")).toBeInTheDocument();
  });

  it("redirects unknown routes to /", () => {
    renderApp("/nonexistent", { authenticated: true });
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("redirects unknown routes to /login when unauthenticated", () => {
    renderApp("/nonexistent");
    expect(screen.getByTestId("login-page")).toBeInTheDocument();
  });
});
