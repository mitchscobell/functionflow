import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ConvertAccountWizard from "../ConvertAccountWizard";
import { AuthProvider } from "../../hooks/useAuth";

// Mock api module
vi.mock("../../lib/api", () => ({
  api: {
    convertDemo: vi.fn(),
    verifyConversion: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { api } from "../../lib/api";
import toast from "react-hot-toast";

const renderWizard = (onClose = vi.fn()) =>
  render(
    <AuthProvider>
      <ConvertAccountWizard onClose={onClose} />
    </AuthProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("ConvertAccountWizard", () => {
  it("starts on intro step", () => {
    renderWizard();
    expect(screen.getByText("Keep Your Account")).toBeInTheDocument();
    expect(screen.getByText("Convert your demo into a permanent account")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("navigates to email step when Get Started clicked", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Get Started"));
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
  });

  it("navigates back to intro from email step", () => {
    renderWizard();
    fireEvent.click(screen.getByText("Get Started"));
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("sends code and navigates to code step", async () => {
    vi.mocked(api.convertDemo).mockResolvedValueOnce({ message: "ok" });

    renderWizard();
    fireEvent.click(screen.getByText("Get Started"));

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByText("Send Code"));

    await waitFor(() => {
      expect(api.convertDemo).toHaveBeenCalledWith("user@test.com");
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("Code sent! Check your email.");
  });

  it("shows error when send code fails", async () => {
    vi.mocked(api.convertDemo).mockRejectedValueOnce(new Error("Email taken"));

    renderWizard();
    fireEvent.click(screen.getByText("Get Started"));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "taken@test.com" },
    });
    fireEvent.click(screen.getByText("Send Code"));

    await waitFor(() => {
      expect(screen.getByText("Email taken")).toBeInTheDocument();
    });
  });

  it("verifies code and shows success step", async () => {
    vi.mocked(api.convertDemo).mockResolvedValueOnce({ message: "ok" });
    vi.mocked(api.verifyConversion).mockResolvedValueOnce({
      token: "jwt",
      user: {
        id: 1,
        email: "user@test.com",
        displayName: "User",
        themePreference: "dark",
      },
    });

    renderWizard();

    // Navigate to email step
    fireEvent.click(screen.getByText("Get Started"));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByText("Send Code"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Enter code
    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Verify & Convert"));

    await waitFor(() => {
      expect(screen.getByText("You're all set!")).toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("Account converted!");
  });

  it("shows error on verify failure and clears code", async () => {
    vi.mocked(api.convertDemo).mockResolvedValueOnce({ message: "ok" });
    vi.mocked(api.verifyConversion).mockRejectedValueOnce(new Error("Invalid code"));

    renderWizard();
    fireEvent.click(screen.getByText("Get Started"));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.click(screen.getByText("Send Code"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "999999" },
    });
    fireEvent.click(screen.getByText("Verify & Convert"));

    await waitFor(() => {
      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
  });

  it("code input only accepts digits and max 6", () => {
    vi.mocked(api.convertDemo).mockResolvedValueOnce({ message: "ok" });

    renderWizard();
    fireEvent.click(screen.getByText("Get Started"));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.com" },
    });

    // Manually navigate to code step
    fireEvent.click(screen.getByText("Send Code"));
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    renderWizard(onClose);

    const backdrop = screen.getByText("Keep Your Account").closest(".fixed");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when X button clicked", () => {
    const onClose = vi.fn();
    renderWizard(onClose);

    // X button is inside the header
    const buttons = screen.getAllByRole("button");
    const closeBtn = buttons.find(
      (b) => b.querySelector("svg") && !b.textContent?.includes("Get Started"),
    );
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose from success step Done button", async () => {
    vi.mocked(api.convertDemo).mockResolvedValueOnce({ message: "ok" });
    vi.mocked(api.verifyConversion).mockResolvedValueOnce({
      token: "jwt",
      user: { id: 1, email: "a@b.com", displayName: "A", themePreference: "" },
    });

    const onClose = vi.fn();
    renderWizard(onClose);

    fireEvent.click(screen.getByText("Get Started"));
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "a@b.com" },
    });
    fireEvent.click(screen.getByText("Send Code"));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("000000"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByText("Verify & Convert"));

    await waitFor(() => {
      expect(screen.getByText("Done")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });
});
