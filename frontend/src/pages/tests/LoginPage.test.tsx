import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { AuthProvider } from "../../hooks/useAuth";
import { ThemeProvider } from "../../hooks/useTheme";

// Mock api
vi.mock("../../lib/api", () => ({
  api: {
    requestCode: vi.fn(),
    verifyCode: vi.fn(),
    devLogin: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import { api } from "../../lib/api";
import toast from "react-hot-toast";

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AuthProvider>
        <ThemeProvider>
          <LoginPage />
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

describe("LoginPage", () => {
  it("renders email step initially", () => {
    renderLoginPage();

    expect(screen.getByText("FunctionFlow")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("shows demo button", () => {
    renderLoginPage();
    expect(screen.getByText(/Try Demo/)).toBeInTheDocument();
  });

  it("requests code and moves to code step", async () => {
    vi.mocked(api.requestCode).mockResolvedValueOnce({ message: "ok" });

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(api.requestCode).toHaveBeenCalledWith("test@example.com");
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("Code sent! Check your email.");
  });

  it("shows error toast when requestCode fails", async () => {
    vi.mocked(api.requestCode).mockRejectedValueOnce(new Error("Rate limited"));

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Rate limited");
    });
  });

  it("verifies code and logs in", async () => {
    vi.mocked(api.requestCode).mockResolvedValueOnce({ message: "ok" });
    vi.mocked(api.verifyCode).mockResolvedValueOnce({
      token: "jwt-token",
      user: {
        id: 1,
        email: "test@example.com",
        displayName: "Test",
        themePreference: "",
      },
    });

    renderLoginPage();

    // Step 1: email
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Step 2: code
    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Verify"));

    await waitFor(() => {
      expect(api.verifyCode).toHaveBeenCalledWith("test@example.com", "123456", false);
    });
    expect(toast.success).toHaveBeenCalledWith("Welcome!");
  });

  it("shows email used message in code step", async () => {
    vi.mocked(api.requestCode).mockResolvedValueOnce({ message: "ok" });

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@mail.com" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("user@mail.com")).toBeInTheDocument();
    });
  });

  it("shows 'Use a different email' button to go back", async () => {
    vi.mocked(api.requestCode).mockResolvedValueOnce({ message: "ok" });

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText("Use a different email")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Use a different email"));
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("shows demo modal on Try Demo click", () => {
    renderLoginPage();

    fireEvent.click(screen.getByText(/Try Demo/));
    expect(screen.getByText("Demo Mode")).toBeInTheDocument();
    expect(screen.getByText(/permanently deleted/)).toBeInTheDocument();
  });

  it("closes demo modal on Cancel", () => {
    renderLoginPage();

    fireEvent.click(screen.getByText(/Try Demo/));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Demo Mode")).not.toBeInTheDocument();
  });

  it("starts demo login on Start Demo click", async () => {
    vi.mocked(api.devLogin).mockResolvedValueOnce({
      token: "demo-jwt",
      user: {
        id: 99,
        email: "dev@functionflow.local",
        displayName: "Demo",
        themePreference: "",
      },
    });

    renderLoginPage();

    fireEvent.click(screen.getByText(/Try Demo/));
    fireEvent.click(screen.getByText("Start Demo"));

    await waitFor(() => {
      expect(api.devLogin).toHaveBeenCalledWith("dev@functionflow.local");
    });
    expect(toast.success).toHaveBeenCalledWith("Demo session started!");
  });

  it("shows error toast when devLogin fails", async () => {
    vi.mocked(api.devLogin).mockRejectedValueOnce(new Error("Not available"));

    renderLoginPage();

    fireEvent.click(screen.getByText(/Try Demo/));
    fireEvent.click(screen.getByText("Start Demo"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Not available");
    });
  });

  it("remember me checkbox defaults unchecked", async () => {
    vi.mocked(api.requestCode).mockResolvedValueOnce({ message: "ok" });

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByText(/Remember me/)).toBeInTheDocument();
    });

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it("auto-submits when 6-digit code is entered", async () => {
    vi.mocked(api.requestCode).mockResolvedValueOnce({ message: "ok" });
    vi.mocked(api.verifyCode).mockResolvedValueOnce({
      token: "jwt-token",
      user: {
        id: 1,
        email: "auto@test.com",
        displayName: "Auto",
        themePreference: "",
      },
    });

    renderLoginPage();

    // Step 1: email
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "auto@test.com" },
    });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Step 2: type full code — should auto-submit without clicking Verify
    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "654321" },
    });

    await waitFor(() => {
      expect(api.verifyCode).toHaveBeenCalledWith("auto@test.com", "654321", false);
    });
    expect(toast.success).toHaveBeenCalledWith("Welcome!");
  });
});
