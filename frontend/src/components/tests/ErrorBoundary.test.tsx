import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../ErrorBoundary";

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <p>child content</p>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders fallback UI when a child throws", () => {
    // Suppress React's error boundary console output during test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected error occurred/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();

    spy.mockRestore();
  });

  it("calls window.location.reload when Refresh is clicked", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(reloadMock).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("logs the error via componentDidCatch", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>,
    );

    // React calls console.error itself, plus our componentDidCatch logs
    const uncaughtCall = errorSpy.mock.calls.find(
      (args) => args[0] === "Uncaught error:",
    );
    expect(uncaughtCall).toBeDefined();
    expect(uncaughtCall![1]).toBeInstanceOf(Error);
    expect(uncaughtCall![1].message).toBe("boom");

    errorSpy.mockRestore();
  });
});
