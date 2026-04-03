import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Layout from "../Layout";
import { AuthProvider } from "../../hooks/useAuth";
import { ThemeProvider } from "../../hooks/useTheme";

// Mock api module
vi.mock("../../lib/api", () => ({
  api: {
    demoLogout: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Mock ConvertAccountWizard - it's complex and has its own tests
vi.mock("../ConvertAccountWizard", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="convert-wizard">
      <button onClick={onClose}>close-wizard</button>
    </div>
  ),
}));

import { api } from "../../lib/api";

function renderLayout(opts: { isDemo?: boolean; initialRoute?: string } = {}) {
  const { isDemo = false, initialRoute = "/" } = opts;

  if (isDemo) {
    localStorage.setItem("isDemo", "true");
  }
  localStorage.setItem("token", "jwt");
  localStorage.setItem(
    "user",
    JSON.stringify({
      id: 1,
      email: "a@b.com",
      displayName: "Test User",
      themePreference: "function",
    }),
  );

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <ThemeProvider>
          <Layout>
            <div data-testid="child-content">Hello</div>
          </Layout>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.documentElement.className = "";
});

describe("Layout", () => {
  it("renders FunctionFlow header and children", () => {
    renderLayout();
    expect(screen.getByText("FunctionFlow")).toBeInTheDocument();
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
  });

  it("shows demo banner when isDemo is true", () => {
    renderLayout({ isDemo: true });
    expect(screen.getByText(/Demo mode/)).toBeInTheDocument();
    expect(screen.getByText("Keep your account")).toBeInTheDocument();
  });

  it("hides demo banner when isDemo is false", () => {
    renderLayout({ isDemo: false });
    expect(screen.queryByText(/Demo mode/)).not.toBeInTheDocument();
  });

  it("shows ConvertAccountWizard when Keep your account clicked", () => {
    renderLayout({ isDemo: true });
    fireEvent.click(screen.getByText("Keep your account"));
    expect(screen.getByTestId("convert-wizard")).toBeInTheDocument();
  });

  it("toggles theme dropdown on click", () => {
    renderLayout();

    // Initially no dropdown items visible
    expect(screen.queryByText("Vaporwave")).not.toBeInTheDocument();

    // Click theme button (find by title)
    const themeButton = screen.getByTitle(/Theme:/);
    fireEvent.click(themeButton);

    // Dropdown should show theme options
    expect(screen.getByText("Vaporwave")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
  });

  it("changes theme when dropdown item clicked", () => {
    renderLayout();

    const themeButton = screen.getByTitle(/Theme:/);
    fireEvent.click(themeButton);
    fireEvent.click(screen.getByText("Dark"));

    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("closes theme dropdown on outside click", () => {
    renderLayout();

    const themeButton = screen.getByTitle(/Theme:/);
    fireEvent.click(themeButton);
    expect(screen.getByText("Vaporwave")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Vaporwave")).not.toBeInTheDocument();
  });

  it("calls logout and navigates to /login", async () => {
    vi.mocked(api.demoLogout).mockResolvedValueOnce({ message: "ok" });

    renderLayout();

    // Find the red logout button (has text-red-500)
    const logoutBtn = document.querySelector(".text-red-500")!;
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBeNull();
    });
  });

  it("calls api.demoLogout before logout when in demo mode", async () => {
    vi.mocked(api.demoLogout).mockResolvedValueOnce({ message: "ok" });

    renderLayout({ isDemo: true });

    const logoutBtn = document.querySelector(".text-red-500")!;
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(api.demoLogout).toHaveBeenCalled();
    });
  });

  it("swallows demoLogout error and still logs out", async () => {
    vi.mocked(api.demoLogout).mockRejectedValueOnce(new Error("gone"));

    renderLayout({ isDemo: true });

    const logoutBtn = document.querySelector(".text-red-500")!;
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBeNull();
    });
  });

  // ── Navigation toggle ──

  it("shows Calendar link when on dashboard", () => {
    renderLayout({ initialRoute: "/" });
    expect(screen.getByTitle("Calendar")).toBeInTheDocument();
    expect(screen.queryByTitle("Back to tasks")).not.toBeInTheDocument();
  });

  it("shows Back to tasks link when on calendar", () => {
    renderLayout({ initialRoute: "/calendar" });
    expect(screen.getByTitle("Back to tasks")).toBeInTheDocument();
    expect(screen.queryByTitle("Calendar")).not.toBeInTheDocument();
  });

  // ── Tooltips ──

  it("has title attributes on all icon buttons", () => {
    renderLayout();
    expect(screen.getByTitle("Profile")).toBeInTheDocument();
    expect(screen.getByTitle("Log out")).toBeInTheDocument();
    expect(screen.getByTitle(/Theme:/)).toBeInTheDocument();
  });
});
