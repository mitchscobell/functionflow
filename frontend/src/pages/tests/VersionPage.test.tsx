import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VersionPage from "../VersionPage";

function renderVersion() {
  return render(
    <MemoryRouter>
      <VersionPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("VersionPage", () => {
  it("shows loading state initially", () => {
    // Make fetch hang forever
    vi.stubGlobal("fetch", () => new Promise(() => {}));

    renderVersion();

    expect(screen.getAllByText("Checking...").length).toBeGreaterThan(0);
  });

  it("shows healthy status after successful fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "FunctionFlow",
            version: "1.2.3",
            status: "healthy",
            database: "connected",
            timestamp: "2024-01-01T00:00:00Z",
          }),
      }),
    );

    renderVersion();

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });
    expect(screen.getByText("v1.2.3")).toBeInTheDocument();
    expect(screen.getByText("connected")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    renderVersion();

    await waitFor(() => {
      expect(screen.getByText("API unreachable")).toBeInTheDocument();
    });
    // Database should also show unknown
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("shows error state when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      }),
    );

    renderVersion();

    await waitFor(() => {
      expect(screen.getByText("API unreachable")).toBeInTheDocument();
    });
  });

  it("renders frontend version", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));

    renderVersion();

    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
    expect(screen.getByText("Frontend")).toBeInTheDocument();
  });

  it("renders green StatusDot for healthy status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            name: "FunctionFlow",
            version: "1.0.0",
            status: "healthy",
            database: "connected",
            timestamp: "2024-01-01T00:00:00Z",
          }),
      }),
    );

    const { container } = renderVersion();

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    // Green dots for healthy status and connected database
    const greenDots = container.querySelectorAll(".bg-emerald-500");
    expect(greenDots.length).toBe(2);
  });

  it("renders red StatusDot when API unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));

    const { container } = renderVersion();

    await waitFor(() => {
      expect(screen.getByText("API unreachable")).toBeInTheDocument();
    });

    const redDots = container.querySelectorAll(".bg-red-500");
    expect(redDots.length).toBe(2);
  });

  it("renders credits section", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));

    renderVersion();

    expect(screen.getByText("Mitch Scobell")).toBeInTheDocument();
  });

  it("renders back button", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));

    renderVersion();

    expect(screen.getByTitle("Go back")).toBeInTheDocument();
  });

  it("renders GitHub link", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));

    renderVersion();

    const link = screen.getByText("View on GitHub").closest("a");
    expect(link).toHaveAttribute("href", "https://github.com/mitchscobell/functionflow");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
