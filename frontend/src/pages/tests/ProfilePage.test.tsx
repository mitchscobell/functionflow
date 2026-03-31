import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "../ProfilePage";
import { AuthProvider } from "../../hooks/useAuth";
import { ThemeProvider } from "../../hooks/useTheme";

// Mock api
vi.mock("../../lib/api", () => ({
  api: {
    getApiKeys: vi.fn(),
    updateProfile: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    demoLogout: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// Mock Layout to simplify
vi.mock("../../components/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { api } from "../../lib/api";
import toast from "react-hot-toast";

function renderProfilePage() {
  localStorage.setItem("token", "jwt");
  localStorage.setItem(
    "user",
    JSON.stringify({
      id: 1,
      email: "user@test.com",
      displayName: "Test User",
      themePreference: "function",
    }),
  );

  return render(
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          <ProfilePage />
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  document.documentElement.className = "";
  vi.mocked(api.getApiKeys).mockResolvedValue([]);
});

describe("ProfilePage", () => {
  it("renders profile heading", () => {
    renderProfilePage();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("shows user email as read-only", () => {
    renderProfilePage();
    expect(screen.getByText("user@test.com")).toBeInTheDocument();
  });

  it("shows display name input with current value", () => {
    renderProfilePage();
    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
  });

  it("renders theme picker with all 5 themes", () => {
    renderProfilePage();
    expect(screen.getByText("Function")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Vaporwave")).toBeInTheDocument();
    expect(screen.getByText("Cyberpunk")).toBeInTheDocument();
  });

  it("saves profile on form submit", async () => {
    vi.mocked(api.updateProfile).mockResolvedValueOnce({
      id: 1,
      email: "user@test.com",
      displayName: "New Name",
      themePreference: "function",
    });

    renderProfilePage();

    fireEvent.change(screen.getByDisplayValue("Test User"), {
      target: { value: "New Name" },
    });
    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalledWith({
        displayName: "New Name",
        themePreference: "function",
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Profile updated");
  });

  it("shows error toast when save fails", async () => {
    vi.mocked(api.updateProfile).mockRejectedValueOnce(new Error("Save failed"));

    renderProfilePage();

    fireEvent.click(screen.getByText("Save Changes"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Save failed");
    });
  });

  it("renders API Keys section", () => {
    renderProfilePage();
    expect(screen.getByText("API Keys")).toBeInTheDocument();
    expect(screen.getByText("No API keys yet. Create one above.")).toBeInTheDocument();
  });

  it("creates a new API key", async () => {
    vi.mocked(api.createApiKey).mockResolvedValueOnce({
      id: 1,
      name: "My Script",
      key: "ff_abc123xyz",
      keyPrefix: "ff_abc",
      createdAt: "2024-01-01T00:00:00Z",
    });
    vi.mocked(api.getApiKeys).mockResolvedValue([
      {
        id: 1,
        name: "My Script",
        keyPrefix: "ff_abc",
        createdAt: "2024-01-01T00:00:00Z",
        isRevoked: false,
      },
    ]);

    renderProfilePage();

    fireEvent.change(screen.getByPlaceholderText("Key name (e.g. My Script)"), {
      target: { value: "My Script" },
    });
    fireEvent.click(screen.getByText("Create"));

    await waitFor(() => {
      expect(api.createApiKey).toHaveBeenCalledWith("My Script");
    });
    await waitFor(() => {
      expect(screen.getByText("ff_abc123xyz")).toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("API key created");
  });

  it("loads existing API keys on mount", async () => {
    vi.mocked(api.getApiKeys).mockResolvedValue([
      {
        id: 1,
        name: "Existing Key",
        keyPrefix: "ff_ex",
        createdAt: "2024-06-01T00:00:00Z",
        isRevoked: false,
      },
    ]);

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText("Existing Key")).toBeInTheDocument();
    });
    expect(screen.getByText("ff_ex...")).toBeInTheDocument();
  });

  it("revokes an API key", async () => {
    vi.mocked(api.getApiKeys).mockResolvedValue([
      {
        id: 1,
        name: "Key1",
        keyPrefix: "ff_k1",
        createdAt: "2024-01-01T00:00:00Z",
        isRevoked: false,
      },
    ]);
    vi.mocked(api.revokeApiKey).mockResolvedValueOnce(undefined);

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText("Key1")).toBeInTheDocument();
    });

    // Click revoke button (trash icon)
    const revokeBtn = screen.getByTitle("Revoke key");
    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(api.revokeApiKey).toHaveBeenCalledWith(1);
    });
    expect(toast.success).toHaveBeenCalledWith("API key revoked");
  });
});
